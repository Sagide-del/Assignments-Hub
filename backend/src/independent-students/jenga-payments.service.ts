import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomBytes, randomUUID } from "crypto";
import {
  IndependentJengaPayment,
  PaymentStatus,
  Prisma,
  SubscriptionInterval,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { IndependentStudentsService } from "./independent-students.service";
import { JengaPaymentProvider } from "./jenga-payment.provider";
import { normalizeMpesaPhone } from "./tuma-payment.provider";
import { StartJengaPaymentDto } from "./dto/start-jenga-payment.dto";

type JengaCallback = {
  code: number;
  reference: string;
  receiptNumber?: string;
  amount?: number;
  mobileNumber?: string;
  payload: Prisma.InputJsonValue;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return undefined;
}

// Jenga callbacks vary slightly by API version. Restrict the accepted fields
// to documented payment identifiers, never arbitrary nested JSON.
function parseCallback(value: unknown): JengaCallback {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException("Invalid Jenga callback.");
  }
  const root = value as Record<string, unknown>;
  const payment =
    root.payment && typeof root.payment === "object" && !Array.isArray(root.payment)
      ? (root.payment as Record<string, unknown>)
      : {};
  const parsedCode = readNumber(root.code ?? root.statusCode ?? payment.code);
  // Jenga account-settlement callbacks identify the original six-character
  // merchant reference as transactionReference and the M-Pesa receipt as
  // telcoReference. The fallback supports the early documented envelope
  // where reference and transactionReference were reversed.
  const directReference = readString(
    root.reference ?? root.paymentReference ?? root.ref ?? payment.ref,
  );
  const transactionReference = readString(root.transactionReference);
  const reference = directReference ?? transactionReference;
  if (
    parsedCode === undefined ||
    !Number.isInteger(parsedCode) ||
    !reference ||
    !/^[A-Za-z0-9]{6}$/.test(reference)
  ) {
    throw new BadRequestException("Invalid Jenga callback fields.");
  }
  const code = parsedCode;
  const receiptNumber = readString(
    root.telcoReference ??
      root.mpesaReceiptNumber ??
      // Only use transactionReference as a receipt when a separate reference
      // is present; otherwise it is the Jenga merchant reference.
      (directReference ? transactionReference : undefined) ??
      payment.telcoReference,
  );
  const amount = readNumber(root.requestAmount ?? root.amount ?? payment.amount);
  const mobileNumber = readString(root.mobileNumber ?? payment.mobileNumber);
  if (code === 3 && (!receiptNumber || !amount || amount <= 0)) {
    throw new BadRequestException("Completed Jenga callbacks require a receipt and amount.");
  }
  return {
    code,
    reference: reference.toUpperCase(),
    receiptNumber,
    amount,
    mobileNumber: mobileNumber ? normalizeMpesaPhone(mobileNumber) ?? undefined : undefined,
    payload: value as Prisma.InputJsonValue,
  };
}

export function jengaPeriodEnd(start: Date, interval: SubscriptionInterval) {
  const end = new Date(start);
  if (interval === "ANNUAL") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

@Injectable()
export class JengaPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: JengaPaymentProvider,
    private readonly independent: IndependentStudentsService,
  ) {}

  capabilities() {
    return { provider: "Jenga", configured: this.provider.isConfigured() };
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
    ) {
      throw new ForbiddenException("M-Pesa subscriptions are for independent learners.");
    }
    return student;
  }

  private view(payment: IndependentJengaPayment) {
    return {
      reference: payment.reference,
      status: payment.status,
      amountKES: payment.amountKES,
      interval: payment.interval,
      phone: `${payment.phone.slice(0, 5)}****${payment.phone.slice(-3)}`,
      expiresAt: payment.expiresAt,
      failureReason: payment.failureReason,
      paidAt: payment.paidAt,
    };
  }

  async latest(actor: AuthenticatedUser) {
    await this.learner(actor);
    const payment = await this.prisma.independentJengaPayment.findFirst({
      where: { studentId: actor.id },
      orderBy: { id: "desc" },
    });
    if (!payment) return null;
    if (
      ([PaymentStatus.PENDING, PaymentStatus.PROCESSING] as PaymentStatus[]).includes(
        payment.status,
      ) &&
      payment.expiresAt <= new Date()
    ) {
      return this.view(
        await this.prisma.independentJengaPayment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.AWAITING_VERIFICATION,
            failureReason:
              "The M-Pesa prompt timed out. Check your M-Pesa messages before retrying.",
          },
        }),
      );
    }
    return this.view(payment);
  }

  async start(actor: AuthenticatedUser, dto: StartJengaPaymentDto) {
    await this.learner(actor);
    if (!this.provider.isConfigured()) {
      throw new ServiceUnavailableException("Jenga M-Pesa payments are not configured yet.");
    }
    const phone = normalizeMpesaPhone(dto.phone);
    if (!phone) {
      throw new BadRequestException("Enter a Kenyan mobile number, for example 0712345678.");
    }
    const prices = this.independent.getPaymentInfo();
    const amountKES =
      dto.interval === "ANNUAL" ? prices.annualAmountKES : prices.monthlyAmountKES;
    if (!amountKES) {
      throw new ServiceUnavailableException("The selected subscription price is not configured.");
    }
    const idempotencyKey = `${actor.id}:${dto.idempotencyKey}`;
    const now = new Date();
    const payment = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id"=${actor.id} FOR UPDATE`;
      const existing = await tx.independentJengaPayment.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        if (existing.phone !== phone || existing.interval !== dto.interval) {
          throw new ConflictException("This payment request was already used for another plan or phone.");
        }
        return { payment: existing, send: false };
      }
      await tx.independentJengaPayment.updateMany({
        where: {
          studentId: actor.id,
          status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] },
          expiresAt: { lte: now },
        },
        data: { status: PaymentStatus.AWAITING_VERIFICATION },
      });
      const active = await tx.independentJengaPayment.findFirst({
        where: {
          studentId: actor.id,
          status: {
            in: [
              PaymentStatus.PENDING,
              PaymentStatus.PROCESSING,
              PaymentStatus.AWAITING_VERIFICATION,
            ],
          },
          expiresAt: { gt: now },
        },
      });
      if (active) return { payment: active, send: false };
      const created = await tx.independentJengaPayment.create({
        data: {
          studentId: actor.id,
          reference: randomBytes(6).toString("hex").slice(0, 6).toUpperCase(),
          idempotencyKey,
          amountKES,
          phone,
          interval: dto.interval,
          expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
        },
      });
      return { payment: created, send: true };
    });

    if (!payment.send) return this.view(payment.payment);
    try {
      const initiated = await this.provider.initiate({
        amount: payment.payment.amountKES,
        phone,
        reference: payment.payment.reference,
      });
      const updated = await this.prisma.independentJengaPayment.update({
        where: { id: payment.payment.id },
        data: {
          status: PaymentStatus.PROCESSING,
          providerReference: initiated.providerReference ?? undefined,
        },
      });
      return this.view(updated);
    } catch (error) {
      await this.prisma.independentJengaPayment.update({
        where: { id: payment.payment.id },
        data: {
          status: PaymentStatus.AWAITING_VERIFICATION,
          failureReason:
            "The prompt could not be confirmed. Check your phone before trying again.",
        },
      });
      throw error;
    }
  }

  async handleCallback(payload: unknown) {
    const callback = parseCallback(payload);
    // A receipt is globally unique. If we have already settled it, retries are
    // acknowledged without touching the learner's subscription again.
    if (callback.receiptNumber) {
      const duplicate = await this.prisma.independentJengaPayment.findUnique({
        where: { receiptNumber: callback.receiptNumber },
      });
      if (duplicate) return { received: true, duplicate: true };
    }
    const initial = await this.prisma.independentJengaPayment.findUnique({
      where: { reference: callback.reference },
    });
    if (!initial) throw new NotFoundException("Jenga payment reference was not found.");

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id"=${initial.studentId} FOR UPDATE`;
      const payment = await tx.independentJengaPayment.findUniqueOrThrow({
        where: { id: initial.id },
      });
      if (payment.status === PaymentStatus.CONFIRMED) return;
      if (callback.code === 0) {
        await tx.independentJengaPayment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PROCESSING, callbackPayload: callback.payload },
        });
        return;
      }
      if ([1, 5, 6, 7].includes(callback.code)) {
        await tx.independentJengaPayment.update({
          where: { id: payment.id },
          data: {
            status:
              callback.code === 7
                ? PaymentStatus.REJECTED
                : [5, 6].includes(callback.code)
                  ? PaymentStatus.CANCELLED
                  : PaymentStatus.FAILED,
            failureReason:
              callback.code === 1
                ? "Payment failed. You can try again."
                : callback.code === 7
                  ? "Payment was rejected."
                  : "Payment was cancelled.",
            callbackPayload: callback.payload,
          },
        });
        return;
      }
      if (callback.code !== 3) {
        throw new BadRequestException("Unsupported Jenga payment status.");
      }
      if (callback.amount !== payment.amountKES) {
        throw new BadRequestException("Jenga payment amount does not match the order.");
      }
      if (callback.mobileNumber && callback.mobileNumber !== payment.phone) {
        throw new BadRequestException("Jenga payment phone does not match the order.");
      }

      const student = await tx.user.findUniqueOrThrow({ where: { id: payment.studentId } });
      const now = new Date();
      const periodStart =
        student.subscriptionExpiresAt && student.subscriptionExpiresAt > now
          ? student.subscriptionExpiresAt
          : now;
      const periodEnd = jengaPeriodEnd(periodStart, payment.interval);
      await tx.independentJengaPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CONFIRMED,
          receiptNumber: callback.receiptNumber!,
          paidAt: now,
          failureReason: null,
          callbackPayload: callback.payload,
        },
      });
      await tx.independentStudentInvoice.create({
        data: {
          studentId: payment.studentId,
          invoiceNumber: `IND-JENGA-${randomUUID()}`,
          studentName: student.name,
          amountKES: payment.amountKES,
          interval: payment.interval,
          periodStart,
          periodEnd,
          mpesaCode: callback.receiptNumber!,
          payerPhone: payment.phone,
        },
      });
      await tx.user.update({
        where: { id: payment.studentId },
        data: {
          subscriptionExpiresAt: periodEnd,
          isActive: true,
          isIndependentTrial: false,
        },
      });
    });
    return { received: true, duplicate: false };
  }
}
