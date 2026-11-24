import { PaymentService } from "../payment/payment.service";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { randomUUID } from "crypto";
import {
  IndependentIntasendPayment,
  PaymentStatus,
  Prisma,
  SubscriptionInterval,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { IndependentStudentsService } from "./independent-students.service";
import { IntasendStkProvider } from "./intasend-stk.provider";
import { normalizeMpesaPhone } from "./tuma-payment.provider";
import { StartIntasendPaymentDto } from "./dto/start-intasend-payment.dto";
import { paymentLandingSource } from "../analytics/payment-attribution";
export function intasendPeriodEnd(start: Date, interval: SubscriptionInterval) {
  const end = new Date(start),
    day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + (interval === "ANNUAL" ? 12 : 1));
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0),
  ).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end;
}
const pending: PaymentStatus[] = [
  PaymentStatus.PENDING,
  PaymentStatus.PROCESSING,
  PaymentStatus.AWAITING_VERIFICATION,
];
@Injectable()
export class IntasendPaymentsService {
  private readonly logger = new Logger(IntasendPaymentsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: IntasendStkProvider,
    private readonly independent: IndependentStudentsService,
    @Optional() private readonly schoolPayments?: PaymentService,
  ) {}
  async capabilities() {
    await this.prisma.independentIntasendPayment.count({ where: { id: -1 } });
    return {
      intasendPaymentsVersion: 1,
      callbackInboxVersion: 1,
      provider: "IntaSend",
      configured: this.provider.isConfigured(),
      mode: this.provider.isLive() ? "live" : "sandbox",
    };
  }
  private async learner(actor: AuthenticatedUser) {
    const s = await this.prisma.user.findUnique({
      where: { id: actor.id },
      include: { school: { select: { code: true } } },
    });
    if (!s || s.role !== "STUDENT" || s.school?.code !== "INDEPENDENT")
      throw new ForbiddenException(
        "This subscription is for independent learners.",
      );
    return s;
  }
  private view(p: IndependentIntasendPayment) {
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
  async latest(actor: AuthenticatedUser) {
    await this.learner(actor);
    let p = await this.prisma.independentIntasendPayment.findFirst({
      where: { studentId: actor.id },
      orderBy: { id: "desc" },
    });
    if (!p) return null;
    if (
      pending.includes(p.status) &&
      p.providerReference &&
      this.provider.isConfigured() &&
      p.updatedAt.getTime() < Date.now() - 10000
    ) {
      try {
        await this.verify(p.reference, p.providerReference);
        p = await this.prisma.independentIntasendPayment.findUniqueOrThrow({
          where: { id: p.id },
        });
      } catch {
        await this.prisma.independentIntasendPayment.updateMany({
          where: { id: p.id, status: { in: pending } },
          data: {
            failureReason:
              "Verification is temporarily delayed. Check status before paying again.",
          },
        });
      }
    }
    if (
      pending.includes(p.status) &&
      p.expiresAt < new Date() &&
      p.status !== PaymentStatus.AWAITING_VERIFICATION
    ) {
      await this.prisma.independentIntasendPayment.updateMany({
        where: { id: p.id, status: { in: pending } },
        data: {
          status: PaymentStatus.AWAITING_VERIFICATION,
          failureReason:
            "Confirmation is delayed. Check your M-Pesa message before retrying.",
        },
      });
      p = await this.prisma.independentIntasendPayment.findUniqueOrThrow({
        where: { id: p.id },
      });
    }
    return this.view(p);
  }
  async start(actor: AuthenticatedUser, dto: StartIntasendPaymentDto) {
    const s = await this.learner(actor);
    this.provider.assertEnabled();
    const phone = normalizeMpesaPhone(dto.phone);
    if (!phone)
      throw new BadRequestException("Enter a valid Kenyan mobile number.");
    const prices = this.independent.getPaymentInfo(),
      amount =
        dto.interval === "ANNUAL"
          ? prices.annualAmountKES
          : prices.monthlyAmountKES;
    if (!Number.isInteger(amount) || amount <= 0)
      throw new BadRequestException("Subscription price is not configured.");
    const key = `${actor.id}:${dto.idempotencyKey}`,
      now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id"=${actor.id} FOR UPDATE`;
      const old = await tx.independentIntasendPayment.findUnique({
        where: { idempotencyKey: key },
      });
      if (old) {
        if (old.phone !== phone || old.interval !== dto.interval)
          throw new ConflictException(
            "This request was used for a different phone or plan.",
          );
        return { payment: old, send: false };
      }
      const active = await tx.independentIntasendPayment.findFirst({
        where: {
          studentId: actor.id,
          status: { in: pending },
          expiresAt: { gt: now },
        },
      });
      if (active) return { payment: active, send: false };
      const legacy = await tx.independentJengaPayment.findFirst({
        where: {
          studentId: actor.id,
          status: { in: pending },
          expiresAt: { gt: now },
        },
      });
      const legacyTuma = await tx.independentTumaPayment.findFirst({
        where: {
          studentId: actor.id,
          status: { in: pending },
          expiresAt: { gt: now },
        },
      });
      if (legacy || legacyTuma)
        throw new ConflictException(
          "An earlier payment is awaiting confirmation. Check it before starting another payment.",
        );
      const source = dto.landing_source
        ? await paymentLandingSource(tx, actor.id, dto.landing_source)
        : (s.landing_source ?? null);
      const payment = await tx.independentIntasendPayment.create({
        data: {
          studentId: actor.id,
          reference: randomUUID(),
          idempotencyKey: key,
          amountKES: amount,
          phone,
          interval: dto.interval,
          expiresAt: new Date(now.getTime() + 15 * 60000),
          landing_source: source,
        },
      });
      return { payment, send: true };
    });
    if (!result.send) return this.view(result.payment);
    try {
      const initiated = await this.provider.initiate({
        amount,
        phone,
        reference: result.payment.reference,
        name: s.name,
        email: s.email,
      });
      await this.prisma.independentIntasendPayment.updateMany({
        where: { id: result.payment.id, status: { in: pending } },
        data: {
          providerReference: initiated.invoiceId,
          status: PaymentStatus.PROCESSING,
        },
      });
    } catch (e) {
      await this.prisma.independentIntasendPayment.updateMany({
        where: { id: result.payment.id, status: { in: pending } },
        data: {
          status: PaymentStatus.AWAITING_VERIFICATION,
          failureReason:
            "The request could not be confirmed. Check your phone before retrying.",
        },
      });
      throw e;
    }
    return this.view(
      await this.prisma.independentIntasendPayment.findUniqueOrThrow({
        where: { id: result.payment.id },
      }),
    );
  }
  async callback(payload: unknown, raw: string) {
    if (!this.provider.validChallenge(payload))
      throw new ForbiddenException("Invalid IntaSend webhook challenge.");
    const p = payload as Record<string, unknown>;
    if (typeof p.invoice_id !== "string" || typeof p.api_ref !== "string")
      throw new BadRequestException("Missing IntaSend invoice or reference.");
    const event = await this.prisma.paymentWebhookEvent.create({
      data: {
        method: "INTASEND",
        eventType: "INDEPENDENT_INTASEND",
        providerReference: p.invoice_id,
        payload: { body: payload, raw } as Prisma.InputJsonValue,
      },
    });
    void this.processEvent(event.id).catch(() =>
      this.logger.warn(
        "IntaSend callback saved; background verification will retry.",
      ),
    );
    return { received: true };
  }
  async processEvent(id: number) {
    const e = await this.prisma.paymentWebhookEvent.findUnique({
      where: { id },
    });
    if (!e || e.processedAt || e.eventType !== "INDEPENDENT_INTASEND") return;
    const body = (e.payload as any).body;
    try {
      if (typeof body.api_ref === "string" && body.api_ref.startsWith("ISR_")) {
        if (!this.schoolPayments)
          throw new BadRequestException("School payment verifier unavailable.");
        const result = await this.schoolPayments.handleWebhook(body);
        if (result?.status === "error")
          throw new BadRequestException(
            "School payment verification rejected.",
          );
      } else await this.verify(body.api_ref, body.invoice_id);
      await this.prisma.paymentWebhookEvent.update({
        where: { id },
        data: {
          processedAt: new Date(),
          processingNotes: "Verified against IntaSend status API",
        },
      });
    } catch (error) {
      if (
        error instanceof HttpException &&
        [400, 404].includes(error.getStatus())
      ) {
        await this.prisma.paymentWebhookEvent.update({
          where: { id },
          data: {
            processedAt: new Date(),
            processingNotes: "Rejected: invoice/order verification mismatch",
          },
        });
        return;
      }
      throw error;
    }
  }
  async verify(reference: string, invoiceId: string) {
    const initial = await this.prisma.independentIntasendPayment.findUnique({
      where: { reference },
    });
    if (!initial) throw new NotFoundException("Payment reference not found.");
    if (initial.status === PaymentStatus.CONFIRMED) return;
    if (initial.providerReference && initial.providerReference !== invoiceId)
      throw new BadRequestException("Invoice does not match this payment.");
    const raw = await this.provider.status(invoiceId),
      invoice = raw?.invoice;
    if (
      !invoice ||
      invoice.invoice_id !== invoiceId ||
      invoice.api_ref !== reference ||
      invoice.currency !== "KES" ||
      Number(invoice.value) !== initial.amountKES
    )
      throw new BadRequestException(
        "IntaSend verification does not match the order.",
      );
    if (
      !["PENDING", "PROCESSING", "COMPLETE", "FAILED", "CANCELLED"].includes(
        invoice.state,
      )
    )
      throw new BadRequestException("Unknown payment state.");
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id"=${initial.studentId} FOR UPDATE`;
      const p = await tx.independentIntasendPayment.findUniqueOrThrow({
        where: { id: initial.id },
      });
      if (p.status === PaymentStatus.CONFIRMED) return;
      if (p.providerReference && p.providerReference !== invoiceId)
        throw new BadRequestException("Invoice mismatch.");
      if (invoice.state !== "COMPLETE") {
        await tx.independentIntasendPayment.update({
          where: { id: p.id },
          data: {
            providerReference: invoiceId,
            status:
              invoice.state === "FAILED"
                ? PaymentStatus.FAILED
                : invoice.state === "CANCELLED"
                  ? PaymentStatus.CANCELLED
                  : PaymentStatus.PROCESSING,
            failureReason: ["FAILED", "CANCELLED"].includes(invoice.state)
              ? "Payment failed or was cancelled. Check your M-Pesa messages."
              : null,
            verifiedPayload: raw as Prisma.InputJsonValue,
          },
        });
        return;
      }
      if (!this.provider.isLive()) {
        await tx.independentIntasendPayment.update({
          where: { id: p.id },
          data: {
            providerReference: invoiceId,
            status: PaymentStatus.AWAITING_VERIFICATION,
            failureReason:
              "Sandbox payment verified. Live subscriptions are not activated by sandbox payments.",
            verifiedPayload: raw as Prisma.InputJsonValue,
          },
        });
        return;
      }
      const student = await tx.user.findUniqueOrThrow({
          where: { id: p.studentId },
        }),
        now = new Date(),
        start =
          student.subscriptionExpiresAt && student.subscriptionExpiresAt > now
            ? student.subscriptionExpiresAt
            : now,
        end = intasendPeriodEnd(start, p.interval);
      await tx.independentStudentInvoice.create({
        data: {
          studentId: p.studentId,
          invoiceNumber: `IND-INTASEND-${randomUUID()}`,
          studentName: student.name,
          amountKES: p.amountKES,
          interval: p.interval,
          periodStart: start,
          periodEnd: end,
          mpesaCode: `IS-${invoiceId}`,
          payerPhone: p.phone,
        },
      });
      await tx.user.update({
        where: { id: p.studentId },
        data: {
          subscriptionExpiresAt: end,
          isActive: true,
          isIndependentTrial: false,
        },
      });
      await tx.independentIntasendPayment.update({
        where: { id: p.id },
        data: {
          providerReference: invoiceId,
          status: PaymentStatus.CONFIRMED,
          paidAt: now,
          failureReason: null,
          verifiedPayload: raw as Prisma.InputJsonValue,
        },
      });
    });
  }
  @Cron("0 * * * * *") async retryCallbacks() {
    if (!this.provider.isConfigured()) return;
    const events = await this.prisma.paymentWebhookEvent.findMany({
      where: {
        method: "INTASEND",
        eventType: "INDEPENDENT_INTASEND",
        processedAt: null,
      },
      orderBy: { id: "asc" },
      take: 50,
    });
    for (const e of events)
      try {
        await this.processEvent(e.id);
      } catch {
        this.logger.warn(`IntaSend event ${e.id} remains queued.`);
      }
  }
  @Cron("0 */15 * * * *") async reconcile() {
    if (!this.provider.isConfigured()) return;
    const payments = await this.prisma.independentIntasendPayment.findMany({
      where: {
        status: { in: pending },
        providerReference: { not: null },
        updatedAt: { lt: new Date(Date.now() - 15 * 60000) },
      },
      orderBy: { updatedAt: "asc" },
      take: 50,
    });
    for (const p of payments)
      try {
        await this.verify(p.reference, p.providerReference!);
      } catch {
        await this.prisma.independentIntasendPayment.updateMany({
          where: { id: p.id, status: { in: pending } },
          data: {
            failureReason:
              "Payment status could not be verified; reconciliation will retry.",
          },
        });
        this.logger.warn(
          `IntaSend payment ${p.id} remains unconfirmed; status query will retry.`,
        );
      }
  }
}
