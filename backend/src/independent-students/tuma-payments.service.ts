import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import {
  IndependentTumaPayment,
  PaymentStatus,
  Prisma,
  SubscriptionInterval,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { IndependentStudentsService } from "./independent-students.service";
import {
  TumaPaymentProvider,
  TumaRequestRejectedException,
  normalizeMpesaPhone,
} from "./tuma-payment.provider";
import { StartTumaPaymentDto } from "./dto/start-tuma-payment.dto";
export function tumaPeriodEnd(start: Date, interval: SubscriptionInterval) {
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  if (interval === "ANNUAL") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end;
}
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
type Callback = {
  status: string;
  merchant_request_id: string;
  checkout_request_id: string;
  result_code: number;
  amount?: number;
  mpesa_receipt_number?: string;
};
function parseCallback(value: unknown): Callback {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new BadRequestException("Invalid callback");
  const v = value as Record<string, unknown>;
  const code =
    typeof v.result_code === "number"
      ? v.result_code
      : typeof v.result_code === "string" && /^\d+$/.test(v.result_code)
        ? Number(v.result_code)
        : NaN;
  if (
    !Number.isInteger(code) ||
    typeof v.merchant_request_id !== "string" ||
    !v.merchant_request_id ||
    v.merchant_request_id.length > 200 ||
    typeof v.checkout_request_id !== "string" ||
    !v.checkout_request_id ||
    v.checkout_request_id.length > 200 ||
    !["completed", "failed"].includes(String(v.status))
  )
    throw new BadRequestException("Invalid payment callback fields");
  const amount =
    typeof v.amount === "number"
      ? v.amount
      : typeof v.amount === "string" && /^\d+(?:\.\d+)?$/.test(v.amount)
        ? Number(v.amount)
        : undefined;
  if (
    code === 0 &&
    (v.status !== "completed" ||
      !Number.isFinite(amount) ||
      amount! <= 0 ||
      typeof v.mpesa_receipt_number !== "string" ||
      !/^[A-Z0-9]{8,20}$/.test(v.mpesa_receipt_number))
  )
    throw new BadRequestException("Invalid completed payment");
  if (code !== 0 && v.status !== "failed")
    throw new BadRequestException("Inconsistent callback state");
  return {
    status: String(v.status),
    merchant_request_id: v.merchant_request_id,
    checkout_request_id: v.checkout_request_id,
    result_code: code,
    ...(code === 0
      ? { amount, mpesa_receipt_number: String(v.mpesa_receipt_number) }
      : {}),
  };
}
@Injectable()
export class TumaPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: TumaPaymentProvider,
    private readonly independent: IndependentStudentsService,
  ) {}
  async capabilities() {
    await this.prisma.independentTumaPayment.count({ where: { id: 0 } });
    return { tumaPaymentsVersion: 1, configured: this.provider.isConfigured() };
  }
  private async learner(actor: AuthenticatedUser) {
    const student = await this.prisma.user.findUnique({
      where: { id: actor.id },
      include: { school: { select: { code: true } } },
    });
    if (
      !student ||
      student.role !== "STUDENT" ||
      student.school?.code !== "INDEPENDENT"
    )
      throw new ForbiddenException(
        "M-Pesa subscriptions are for independent learners.",
      );
    return student;
  }
  private view(p: IndependentTumaPayment) {
    return {
      reference: p.reference,
      status: p.status,
      amountKES: p.amountKES,
      interval: p.interval,
      phone: `${p.phone.slice(0, 5)}****${p.phone.slice(-3)}`,
      expiresAt: p.expiresAt,
      failureReason: p.failureReason,
      paidAt: p.paidAt,
    };
  }
  async latest(
    actor: AuthenticatedUser,
  ): Promise<ReturnType<TumaPaymentsService["view"]> | null> {
    await this.learner(actor);
    const p = await this.prisma.independentTumaPayment.findFirst({
      where: { studentId: actor.id },
      orderBy: { id: "desc" },
    });
    if (!p) return null;
    if (
      ["PENDING", "PROCESSING"].includes(p.status) &&
      p.expiresAt < new Date()
    ) {
      const result = await this.prisma.independentTumaPayment.updateMany({
        where: { id: p.id, status: { in: ["PENDING", "PROCESSING"] } },
        data: {
          status: "AWAITING_VERIFICATION",
          failureReason:
            "The prompt has timed out. Check your M-Pesa messages before retrying. If you were charged, contact support with the receipt.",
        },
      });
      if (result.count) {
        p.status = "AWAITING_VERIFICATION";
        p.failureReason =
          "The prompt has timed out. Check M-Pesa before retrying; contact support if charged.";
      } else return this.latest(actor);
    }
    return this.view(p);
  }
  async start(actor: AuthenticatedUser, dto: StartTumaPaymentDto) {
    await this.learner(actor);
    if (!this.provider.isConfigured())
      throw new ServiceUnavailableException(
        "M-Pesa payments are not configured yet.",
      );
    const phone = normalizeMpesaPhone(dto.phone);
    if (!phone)
      throw new BadRequestException(
        "Enter a Kenyan mobile number, for example 0712345678.",
      );
    const prices = this.independent.getPaymentInfo(),
      amountKES =
        dto.interval === "ANNUAL"
          ? prices.annualAmountKES
          : prices.monthlyAmountKES;
    if (!amountKES)
      throw new ServiceUnavailableException(
        "The selected subscription price is not configured.",
      );
    const key = `${actor.id}:${dto.idempotencyKey}`,
      token = randomBytes(32).toString("hex"),
      now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id"=${actor.id} FOR UPDATE`;
      const currentStudent = await tx.user.findUniqueOrThrow({
        where: { id: actor.id },
        include: { school: { select: { code: true } } },
      });
      if (
        currentStudent.role !== "STUDENT" ||
        currentStudent.school?.code !== "INDEPENDENT"
      )
        throw new ForbiddenException(
          "M-Pesa subscriptions are for independent learners.",
        );
      const existing = await tx.independentTumaPayment.findUnique({
        where: { idempotencyKey: key },
      });
      if (existing) {
        if (existing.phone !== phone || existing.interval !== dto.interval)
          throw new ConflictException(
            "This payment request was already used for another plan or phone.",
          );
        return { payment: existing, send: false };
      }
      await tx.independentTumaPayment.updateMany({
        where: {
          studentId: actor.id,
          status: { in: ["PENDING", "PROCESSING"] },
          expiresAt: { lte: now },
        },
        data: {
          status: "AWAITING_VERIFICATION",
          failureReason: "Prompt timed out; check M-Pesa before retrying.",
        },
      });
      const active = await tx.independentTumaPayment.findFirst({
        where: {
          studentId: actor.id,
          status: { in: ["PENDING", "PROCESSING"] },
        },
      });
      if (active) {
        if (active.phone !== phone || active.interval !== dto.interval)
          throw new ConflictException(
            "A payment prompt is already pending. Complete it or wait before changing plans or phone.",
          );
        return { payment: active, send: false };
      }
      const payment = await tx.independentTumaPayment.create({
        data: {
          studentId: actor.id,
          reference: `AH-TUMA-${randomUUID()}`,
          idempotencyKey: key,
          phone,
          interval: dto.interval,
          amountKES,
          callbackTokenHash: hash(token),
          expiresAt: new Date(now.getTime() + 15 * 60000),
        },
      });
      return { payment, send: true };
    });
    if (!result.send) return this.view(result.payment);
    const p = result.payment;
    try {
      const ids = await this.provider.initiate({
        amount: amountKES,
        phone,
        callbackUrl: `${this.provider.callbackBase()}/${p.reference}/${token}`,
        reference: p.reference,
      });
      const current = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id"=${actor.id} FOR UPDATE`;
        return tx.independentTumaPayment.update({
          where: { id: p.id },
          data: { ...ids, status: "PROCESSING" },
        });
      });
      if (current?.callbackPayload)
        await this.apply(p.id, parseCallback(current.callbackPayload));
    } catch (error) {
      const uncertain = !(
        error instanceof ServiceUnavailableException ||
        error instanceof TumaRequestRejectedException
      );
      await this.prisma.independentTumaPayment.updateMany({
        where: { id: p.id, status: { not: "CONFIRMED" } },
        data: {
          status: uncertain ? "AWAITING_VERIFICATION" : "FAILED",
          failureReason: uncertain
            ? "The request could not be confirmed. Check your phone and M-Pesa messages before retrying; contact support if charged."
            : "M-Pesa is temporarily unavailable. Please try again later.",
        },
      });
    }
    return this.view(
      await this.prisma.independentTumaPayment.findUniqueOrThrow({
        where: { id: p.id },
      }),
    );
  }
  async callback(reference: string, token: string, payload: unknown) {
    const p = await this.prisma.independentTumaPayment.findUnique({
      where: { reference },
    });
    if (
      !p ||
      !/^[a-f0-9]{64}$/.test(token) ||
      !timingSafeEqual(
        Buffer.from(p.callbackTokenHash, "hex"),
        Buffer.from(hash(token), "hex"),
      )
    )
      throw new ForbiddenException("Invalid payment callback.");
    await this.apply(p.id, parseCallback(payload));
    return { received: true };
  }
  private async apply(id: number, body: Callback) {
    const initial = await this.prisma.independentTumaPayment.findUniqueOrThrow({
      where: { id },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id"=${initial.studentId} FOR UPDATE`;
      const p = await tx.independentTumaPayment.findUniqueOrThrow({
        where: { id },
      });
      if (body.result_code === 0 && body.amount !== p.amountKES)
        throw new BadRequestException(
          "Payment amount does not match the order.",
        );
      if (
        p.checkoutRequestId &&
        (p.checkoutRequestId !== body.checkout_request_id ||
          p.merchantRequestId !== body.merchant_request_id)
      )
        throw new BadRequestException(
          "Payment request identifiers do not match.",
        );
      if (p.status === "CONFIRMED") return;
      if (!p.checkoutRequestId) {
        const previous = p.callbackPayload as any;
        if (previous?.result_code !== 0 || body.result_code === 0)
          await tx.independentTumaPayment.update({
            where: { id },
            data: { callbackPayload: body as unknown as Prisma.InputJsonValue },
          });
        return;
      }
      if (body.result_code !== 0) {
        await tx.independentTumaPayment.update({
          where: { id },
          data: {
            status: body.result_code === 1032 ? "CANCELLED" : "FAILED",
            failureReason:
              body.result_code === 1032
                ? "Payment was cancelled."
                : body.result_code === 1037
                  ? "The M-Pesa prompt expired."
                  : "Payment was not completed. You can try again.",
            callbackPayload: body as unknown as Prisma.InputJsonValue,
          },
        });
        return;
      }
      const student = await tx.user.findUniqueOrThrow({
        where: { id: p.studentId },
        include: { school: { select: { code: true } } },
      });
      if (student.school?.code !== "INDEPENDENT" || student.role !== "STUDENT")
        throw new ForbiddenException(
          "The account is no longer an independent learner.",
        );
      const now = new Date(),
        periodStart =
          student.subscriptionExpiresAt && student.subscriptionExpiresAt > now
            ? student.subscriptionExpiresAt
            : now,
        periodEnd = tumaPeriodEnd(periodStart, p.interval);
      await tx.independentTumaPayment.update({
        where: { id },
        data: {
          status: PaymentStatus.CONFIRMED,
          paidAt: now,
          receiptNumber: body.mpesa_receipt_number,
          failureReason: null,
          callbackPayload: body as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.independentStudentInvoice.create({
        data: {
          studentId: p.studentId,
          invoiceNumber: `IND-TUMA-${randomUUID()}`,
          studentName: student.name,
          amountKES: p.amountKES,
          interval: p.interval,
          periodStart,
          periodEnd,
          mpesaCode: body.mpesa_receipt_number!,
          payerPhone: p.phone,
        },
      });
      await tx.user.update({
        where: { id: p.studentId },
        data: {
          subscriptionExpiresAt: periodEnd,
          isActive: true,
          isIndependentTrial: false,
        },
      });
    });
  }
}
