import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SubscriptionInterval,
  SubscriptionStatus,
} from '@prisma/client';
import PDFDocument = require('pdfkit');
import { promises as fs } from 'fs';
import { join } from 'path';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { computeMonthlyPriceKES, ComputedPricing, SchoolType } from '../common/config/plans';
import { PrismaService } from '../prisma/prisma.service';
import { IntaSendPaymentProvider } from './providers/intasend-payment.provider';
import { MpesaPaymentProvider } from './providers/mpesa-payment.provider';

interface SubscriptionActivationData {
  planName: string;
  amountKES: number;
  studentCount: number;
  schoolType: SchoolType;
  interval: SubscriptionInterval;
  paymentMethod: PaymentMethod;
  invoiceId?: number;
  paymentTransactionId?: number;
  providerReference?: string;
  rawPayload?: unknown;
  verifiedById?: number;
}

export interface PaymentProviderView {
  method: PaymentMethod;
  displayName: string;
  logoUrl: string | null;
  instructions: string | null;
  isActive: boolean;
  paymentDetails: Record<string, unknown> | null;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly webhookSecret: string;
  private readonly invoiceStorageDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly intaSendProvider: IntaSendPaymentProvider,
    private readonly mpesaProvider: MpesaPaymentProvider,
  ) {
    this.webhookSecret = this.configService.get('INTASEND_WEBHOOK_SECRET') || '';
    this.invoiceStorageDir = join(process.cwd(), 'generated', 'invoices');
    if (!this.webhookSecret) {
      this.logger.warn(
        'INTASEND_WEBHOOK_SECRET is not set â€” all incoming IntaSend webhooks will be rejected, so paid subscriptions will never auto-activate. Set it in .env to the challenge string configured on the IntaSend dashboard.',
      );
    }
  }

  private logoDataUrl(label: string, bg: string, fg: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="80" viewBox="0 0 220 80"><rect width="220" height="80" rx="18" fill="${bg}"/><text x="110" y="47" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${fg}">${label}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private normalizeInterval(interval?: string): SubscriptionInterval {
    return interval?.toLowerCase() === 'annual' ? SubscriptionInterval.ANNUAL : SubscriptionInterval.MONTHLY;
  }

  private buildCurrentPeriodEnd(start: Date, interval: SubscriptionInterval): Date {
    const end = new Date(start);
    if (interval === SubscriptionInterval.ANNUAL) {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }

  private createInvoiceNumber(schoolId: number): string {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV-${stamp}-${schoolId}-${random}`;
  }

  private async ensureProviderConfigs() {
    const defaults: Array<{
      method: PaymentMethod;
      displayName: string;
      logoUrl: string;
      instructions: string;
      isActive: boolean;
      configuration: Record<string, unknown>;
    }> = [
      {
        method: PaymentMethod.INTASEND,
        displayName: 'IntaSend',
        logoUrl: this.logoDataUrl('IntaSend', '#101820', '#B5E61D'),
        instructions: 'Pay online using the hosted IntaSend checkout. You will be redirected to complete the payment securely.',
        isActive: true,
        configuration: {
          channel: 'online_checkout',
          currency: 'KES',
          settlement: 'automatic_webhook_confirmation',
        },
      },
      {
        method: PaymentMethod.MPESA,
        displayName: 'M-Pesa',
        logoUrl: this.logoDataUrl('M-Pesa', '#1B5E20', '#FFFFFF'),
        instructions: 'Mobile payment integration is prepared in the billing engine. A live provider connection can be enabled without changing the frontend contract.',
        isActive: false,
        configuration: {
          shortCode: this.configService.get('MPESA_SHORT_CODE') || 'Not configured',
          accountReferenceLabel: 'Invoice Number',
          integrationStatus: 'provider_ready',
        },
      },
      {
        method: PaymentMethod.EQUITY_PAYBILL,
        displayName: 'Equity Bank Paybill',
        logoUrl: this.logoDataUrl('Equity', '#8B1E3F', '#FFFFFF'),
        instructions: 'Make the payment to the configured Equity Bank paybill, then submit the payment reference for platform verification.',
        isActive: true,
        configuration: {
          paybillNumber: this.configService.get('EQUITY_PAYBILL_NUMBER') || '247247',
          accountReferenceLabel: 'Use the invoice number as the account/reference',
          supportContact: this.configService.get('BILLING_SUPPORT_EMAIL') || 'billing@assignmenthub.local',
        },
      },
    ];

    await Promise.all(
      defaults.map((config) =>
        this.prisma.paymentProviderConfig.upsert({
          where: { method: config.method },
          update: {},
          create: {
            method: config.method,
            displayName: config.displayName,
            logoUrl: config.logoUrl,
            instructions: config.instructions,
            isActive: config.isActive,
            configuration: this.toJsonValue(config.configuration),
          },
        }),
      ),
    );
  }

  private async getProviderConfig(method: PaymentMethod) {
    await this.ensureProviderConfigs();
    const config = await this.prisma.paymentProviderConfig.findUnique({ where: { method } });
    if (!config) throw new NotFoundException(`Payment provider ${method} is not configured`);
    return config;
  }

  private mapProviderConfig(config: {
    method: PaymentMethod;
    displayName: string;
    logoUrl: string | null;
    instructions: string | null;
    isActive: boolean;
    configuration: Prisma.JsonValue | null;
  }): PaymentProviderView {
    return {
      method: config.method,
      displayName: config.displayName,
      logoUrl: config.logoUrl,
      instructions: config.instructions,
      isActive: config.isActive,
      paymentDetails:
        config.configuration && typeof config.configuration === 'object' && !Array.isArray(config.configuration)
          ? (config.configuration as Record<string, unknown>)
          : null,
    };
  }

  private resolveTargetSchoolId(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;
    if (!targetSchoolId) throw new BadRequestException('schoolId is required');
    return targetSchoolId;
  }

  private assertTenant(schoolId: number, actor: AuthenticatedUser) {
    if (actor.role === Role.PLATFORM_ADMIN) return;
    if (actor.schoolId !== schoolId) {
      throw new ForbiddenException("You cannot access another school's billing data");
    }
  }

  private buildApiRef(
    kind: 'SCHOOL' | 'SUB',
    schoolId: number,
    pricing: ComputedPricing,
    invoiceId: number,
    paymentTransactionId: number,
    interval: SubscriptionInterval,
  ) {
    const payload = {
      k: kind,
      s: schoolId,
      p: pricing.tier.name,
      a: pricing.amountKES,
      c: pricing.studentCount,
      y: pricing.schoolType,
      i: interval,
      iv: invoiceId,
      pt: paymentTransactionId,
      t: Date.now(),
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `ISR_${encoded}`;
  }

  private parseApiRef(apiRef: string): {
    schoolId?: number;
    plan?: string;
    amountKES?: number;
    studentCount?: number;
    schoolType?: SchoolType;
    interval?: SubscriptionInterval;
    invoiceId?: number;
    paymentTransactionId?: number;
  } {
    if (!apiRef || !apiRef.startsWith('ISR_')) return {};
    try {
      const json = Buffer.from(apiRef.slice(4), 'base64url').toString('utf8');
      const payload = JSON.parse(json);
      return {
        schoolId: Number.isFinite(Number(payload.s)) ? Number(payload.s) : undefined,
        plan: typeof payload.p === 'string' ? payload.p : undefined,
        amountKES: Number.isFinite(Number(payload.a)) ? Number(payload.a) : undefined,
        studentCount: Number.isFinite(Number(payload.c)) ? Number(payload.c) : undefined,
        schoolType: payload.y === 'BOARDING' ? 'BOARDING' : payload.y === 'DAY' ? 'DAY' : undefined,
        interval: payload.i === 'ANNUAL' || payload.i === 'MONTHLY' ? payload.i : undefined,
        invoiceId: Number.isFinite(Number(payload.iv)) ? Number(payload.iv) : undefined,
        paymentTransactionId: Number.isFinite(Number(payload.pt)) ? Number(payload.pt) : undefined,
      };
    } catch {
      return {};
    }
  }

  private async computePricingForSchool(schoolId: number): Promise<ComputedPricing> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new BadRequestException('School not found');
    const studentCount = await this.prisma.user.count({ where: { schoolId, role: Role.STUDENT } });
    return computeMonthlyPriceKES(studentCount, school.type as SchoolType);
  }

  async getPricingForSchool(schoolId: number): Promise<ComputedPricing> {
    return this.computePricingForSchool(schoolId);
  }

  async getPaymentProviders() {
    await this.ensureProviderConfigs();
    const configs = await this.prisma.paymentProviderConfig.findMany({ orderBy: { displayName: 'asc' } });
    return configs.map((config) => this.mapProviderConfig(config));
  }

  private async createBillingRecords(
    schoolId: number,
    pricing: ComputedPricing,
    method: PaymentMethod,
    interval: SubscriptionInterval,
  ) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('School not found');

    const now = new Date();
    const dueAt = this.buildCurrentPeriodEnd(now, interval);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          schoolId,
          invoiceNumber: this.createInvoiceNumber(schoolId),
          status: InvoiceStatus.ISSUED,
          interval,
          paymentMethod: method,
          amountKES: pricing.amountKES,
          currency: 'KES',
          studentCountSnapshot: pricing.studentCount,
          schoolTypeSnapshot: pricing.schoolType,
          planSnapshot: pricing.tier.name,
          issuedAt: now,
          dueAt,
          metadata: this.toJsonValue({
            schoolNameSnapshot: school.name,
            schoolCodeSnapshot: school.code,
            pricingSnapshot: pricing,
          }),
        },
      });

      const paymentTransaction = await tx.paymentTransaction.create({
        data: {
          schoolId,
          invoiceId: invoice.id,
          method,
          status: pricing.amountKES <= 0 ? PaymentStatus.CONFIRMED : PaymentStatus.PENDING,
          providerName: method,
          amountKES: pricing.amountKES,
          currency: 'KES',
          initiatedAt: now,
          confirmedAt: pricing.amountKES <= 0 ? now : undefined,
          metadata: this.toJsonValue({
            pricingSnapshot: pricing,
            interval,
          }),
        },
      });

      return { invoice, paymentTransaction, school };
    });
  }

  private buildPaymentResponse(
    rawResponse: Record<string, unknown>,
    invoiceId: number,
    paymentTransactionId: number,
  ) {
    return {
      ...rawResponse,
      invoiceId,
      paymentTransactionId,
    };
  }

  private async completeFreeTierActivation(
    schoolId: number,
    pricing: ComputedPricing,
    interval: SubscriptionInterval,
    invoiceId: number,
    paymentTransactionId: number,
  ) {
    if (pricing.amountKES > 0) return null;

    await this.activateSubscription(schoolId, {
      planName: pricing.tier.name,
      amountKES: pricing.amountKES,
      studentCount: pricing.studentCount,
      schoolType: pricing.schoolType,
      interval,
      paymentMethod: PaymentMethod.INTASEND,
      invoiceId,
      paymentTransactionId,
      rawPayload: {
        provider: 'INTASEND',
        freeTier: true,
      },
    });

    return {
      free: true,
      tier: pricing.tier.name,
      studentCount: pricing.studentCount,
      invoiceId,
      paymentTransactionId,
      message: `This school qualifies for the Free tier (${pricing.studentCount} students) â€” activated with no payment required.`,
    };
  }

  private async finalizeCheckoutFailure(
    invoiceId: number,
    paymentTransactionId: number,
    payload: unknown,
  ) {
    await this.prisma.$transaction([
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.VOID,
          metadata: this.toJsonValue({
            checkoutError: payload,
          }),
        },
      }),
      this.prisma.paymentTransaction.update({
        where: { id: paymentTransactionId },
        data: {
          status: PaymentStatus.FAILED,
          metadata: this.toJsonValue({
            checkoutError: payload,
          }),
        },
      }),
    ]);
  }

  private async startIntaSendCheckout(
    kind: 'SCHOOL' | 'SUB',
    email: string,
    schoolId: number,
    interval: SubscriptionInterval,
  ) {
    const provider = await this.getProviderConfig(PaymentMethod.INTASEND);
    if (!provider.isActive) {
      throw new BadRequestException('IntaSend payments are currently disabled');
    }

    const pricing = await this.computePricingForSchool(schoolId);
    const { invoice, paymentTransaction } = await this.createBillingRecords(
      schoolId,
      pricing,
      PaymentMethod.INTASEND,
      interval,
    );

    const freeTierResponse = await this.completeFreeTierActivation(
      schoolId,
      pricing,
      interval,
      invoice.id,
      paymentTransaction.id,
    );
    if (freeTierResponse) {
      return freeTierResponse;
    }

    try {
      const checkout = await this.intaSendProvider.createCheckout({
        email,
        amountKES: pricing.amountKES,
        currency: 'KES',
        apiRef: this.buildApiRef(kind, schoolId, pricing, invoice.id, paymentTransaction.id, interval),
        host: this.configService.get('APP_URL') || undefined,
        redirectUrl: this.configService.get('PAYMENT_REDIRECT_URL') || undefined,
      });

      await this.prisma.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          status: PaymentStatus.PROCESSING,
          providerReference: checkout.providerReference,
          paymentReference: checkout.providerReference,
          metadata: this.toJsonValue({
            pricingSnapshot: pricing,
            interval,
            checkoutResponse: checkout.rawResponse,
          }),
        },
      });

      return this.buildPaymentResponse(checkout.rawResponse, invoice.id, paymentTransaction.id);
    } catch (error) {
      await this.finalizeCheckoutFailure(
        invoice.id,
        paymentTransaction.id,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async createPayment(email: string, schoolId: number) {
    return this.startIntaSendCheckout('SCHOOL', email, schoolId, SubscriptionInterval.MONTHLY);
  }

  async createSubscription(email: string, schoolId: number, interval: string = 'monthly') {
    return this.startIntaSendCheckout('SUB', email, schoolId, this.normalizeInterval(interval));
  }

  async verifyPayment(invoiceId: string) {
    return this.intaSendProvider.verifyPayment(invoiceId);
  }

  async createEquityPaybillPayment(
    actor: AuthenticatedUser,
    input: { schoolId?: number; paymentReference: string; payerName: string; payerPhone: string; interval?: string },
  ) {
    const schoolId = this.resolveTargetSchoolId(actor, input.schoolId);
    const provider = await this.getProviderConfig(PaymentMethod.EQUITY_PAYBILL);
    if (!provider.isActive) {
      throw new BadRequestException('Equity Paybill payments are currently disabled');
    }

    const pricing = await this.computePricingForSchool(schoolId);
    const { invoice, paymentTransaction } = await this.createBillingRecords(
      schoolId,
      pricing,
      PaymentMethod.EQUITY_PAYBILL,
      this.normalizeInterval(input.interval),
    );

    const updatedTransaction = await this.prisma.paymentTransaction.update({
      where: { id: paymentTransaction.id },
      data: {
        status: PaymentStatus.AWAITING_VERIFICATION,
        paymentReference: input.paymentReference,
        providerReference: input.paymentReference,
        payerName: input.payerName,
        payerPhone: input.payerPhone,
        metadata: this.toJsonValue({
          submittedBy: actor.id,
          submittedAt: new Date().toISOString(),
        }),
      },
    });

    return {
      invoice,
      paymentTransaction: updatedTransaction,
      provider: this.mapProviderConfig(provider),
    };
  }

  async createMpesaPayment(
    actor: AuthenticatedUser,
    input: { schoolId?: number; payerName: string; payerPhone: string; interval?: string },
  ) {
    const schoolId = this.resolveTargetSchoolId(actor, input.schoolId);
    const provider = await this.getProviderConfig(PaymentMethod.MPESA);
    if (!provider.isActive) {
      throw new BadRequestException('M-Pesa payments are currently disabled');
    }

    const pricing = await this.computePricingForSchool(schoolId);
    const interval = this.normalizeInterval(input.interval);
    const { invoice, paymentTransaction } = await this.createBillingRecords(
      schoolId,
      pricing,
      PaymentMethod.MPESA,
      interval,
    );

    const providerResponse = await this.mpesaProvider.createCheckout({
      email: input.payerPhone,
      amountKES: pricing.amountKES,
      currency: 'KES',
      apiRef: this.buildApiRef('SUB', schoolId, pricing, invoice.id, paymentTransaction.id, interval),
      host: this.configService.get('APP_URL') || undefined,
      redirectUrl: this.configService.get('PAYMENT_REDIRECT_URL') || undefined,
    });

    const updatedTransaction = await this.prisma.paymentTransaction.update({
      where: { id: paymentTransaction.id },
      data: {
        status: PaymentStatus.PENDING,
        payerName: input.payerName,
        payerPhone: input.payerPhone,
        metadata: this.toJsonValue({
          providerResponse: providerResponse.rawResponse,
          providerReady: false,
        }),
      },
    });

    return {
      invoice,
      paymentTransaction: updatedTransaction,
      provider: this.mapProviderConfig(provider),
      providerResponse: providerResponse.rawResponse,
    };
  }

  verifyWebhookChallenge(payload: any): boolean {
    return !!this.webhookSecret && payload?.challenge === this.webhookSecret;
  }

  async handleWebhook(payload: any) {
    this.logger.log('Processing IntaSend webhook...');

    if (!this.verifyWebhookChallenge(payload)) {
      this.logger.error('Invalid webhook challenge â€” payload.challenge did not match INTASEND_WEBHOOK_SECRET (or the secret is unset)');
      return { status: 'error', message: 'Invalid challenge' };
    }

    const { state, api_ref: apiRef, invoice_id: invoiceId, value, failed_reason: failedReason } = payload || {};
    const {
      schoolId,
      plan,
      amountKES: expectedAmount,
      studentCount,
      schoolType,
      interval,
      invoiceId: internalInvoiceId,
      paymentTransactionId,
    } = this.parseApiRef(apiRef);

    await this.recordWebhookEvent(payload, state, invoiceId, paymentTransactionId, PaymentMethod.INTASEND);

    switch (state) {
      case 'COMPLETE': {
        this.logger.log(`Payment complete (invoice ${invoiceId})`);
        if (!schoolId || !plan || !expectedAmount) {
          this.logger.error(`Could not recover schoolId/plan/amount from api_ref "${apiRef}" â€” cannot activate a subscription automatically.`);
          return { status: 'error', message: 'Missing schoolId/plan/amount in api_ref', state };
        }

        const paidAmount = Number(value);
        if (!Number.isFinite(paidAmount) || paidAmount < expectedAmount) {
          this.logger.error(
            `Webhook for invoice ${invoiceId} paid ${value} but checkout was for KES ${expectedAmount} (tier "${plan}") â€” refusing to activate. schoolId=${schoolId}`,
          );
          return { status: 'error', message: 'Paid amount does not match quoted price', state };
        }

        await this.activateSubscription(schoolId, {
          planName: plan,
          amountKES: expectedAmount,
          studentCount: studentCount ?? 0,
          schoolType: schoolType ?? 'DAY',
          interval: interval ?? SubscriptionInterval.MONTHLY,
          paymentMethod: PaymentMethod.INTASEND,
          invoiceId: internalInvoiceId,
          paymentTransactionId,
          providerReference: invoiceId,
          rawPayload: payload,
        });
        return { status: 'success', message: 'Subscription activated', state };
      }

      case 'FAILED':
        this.logger.log(`Payment failed (invoice ${invoiceId}): ${failedReason || 'no reason given'}`);
        await this.updatePendingBillingState(
          internalInvoiceId,
          paymentTransactionId,
          InvoiceStatus.OVERDUE,
          PaymentStatus.FAILED,
          invoiceId,
          payload,
        );
        return { status: 'error', message: 'Payment failed', state };

      case 'PENDING':
      case 'PROCESSING':
        this.logger.log(`Payment ${state.toLowerCase()} (invoice ${invoiceId})`);
        await this.updatePendingBillingState(
          internalInvoiceId,
          paymentTransactionId,
          InvoiceStatus.ISSUED,
          state === 'PENDING' ? PaymentStatus.PENDING : PaymentStatus.PROCESSING,
          invoiceId,
          payload,
        );
        return { status: 'success', message: `Payment ${state.toLowerCase()}`, state };

      default:
        this.logger.log(`Unhandled webhook state: ${state}`);
        return { status: 'success', message: 'Webhook received', state: state || 'unknown' };
    }
  }

  private async activateSubscription(schoolId: number, data: SubscriptionActivationData) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      this.logger.error(`Billing referenced unknown schoolId ${schoolId} â€” ignoring.`);
      return;
    }

    const existingTransaction = data.paymentTransactionId
      ? await this.prisma.paymentTransaction.findUnique({ where: { id: data.paymentTransactionId } })
      : null;
    if (existingTransaction?.subscriptionId) {
      return;
    }

    const currentPeriodStart = new Date();
    const currentPeriodEnd = this.buildCurrentPeriodEnd(currentPeriodStart, data.interval);
    const expiresAt = currentPeriodEnd;

    await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          schoolId,
          plan: data.planName,
          status: SubscriptionStatus.ACTIVE,
          amountKES: data.amountKES,
          studentCount: data.studentCount,
          schoolType: data.schoolType,
          interval: data.interval,
          paymentMethod: data.paymentMethod,
          currentPeriodStart,
          currentPeriodEnd,
          expiresAt,
        },
      });

      await tx.school.update({
        where: { id: schoolId },
        data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      });

      if (data.invoiceId) {
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: {
            subscriptionId: subscription.id,
            status: InvoiceStatus.PAID,
            paidAt: currentPeriodStart,
            metadata: this.toJsonValue({
              activatedFrom: data.paymentMethod,
              rawPayload: data.rawPayload ?? null,
            }),
          },
        });
      }

      if (data.paymentTransactionId) {
        await tx.paymentTransaction.update({
          where: { id: data.paymentTransactionId },
          data: {
            subscriptionId: subscription.id,
            invoiceId: data.invoiceId,
            status: PaymentStatus.CONFIRMED,
            providerReference: data.providerReference,
            paymentReference: data.providerReference ?? existingTransaction?.paymentReference,
            confirmedAt: currentPeriodStart,
            verifiedById: data.verifiedById,
            verifiedAt: data.verifiedById ? currentPeriodStart : undefined,
            metadata: this.toJsonValue({
              activatedFrom: data.paymentMethod,
              rawPayload: data.rawPayload ?? null,
            }),
          },
        });
      }
    });

    this.logger.log(
      `Activated "${data.planName}" subscription for school ${schoolId} (KES ${data.amountKES}/mo, ${data.studentCount} students, ${data.schoolType}, expires ${expiresAt.toISOString()})`,
    );
  }

  private async updatePendingBillingState(
    invoiceId: number | undefined,
    paymentTransactionId: number | undefined,
    invoiceStatus: InvoiceStatus,
    paymentStatus: PaymentStatus,
    providerReference: string | undefined,
    payload: unknown,
  ) {
    const operations: Prisma.PrismaPromise<unknown>[] = [];

    if (invoiceId) {
      operations.push(
        this.prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: invoiceStatus,
            metadata: this.toJsonValue({
              lastWebhookPayload: payload,
            }),
          },
        }),
      );
    }

    if (paymentTransactionId) {
      operations.push(
        this.prisma.paymentTransaction.update({
          where: { id: paymentTransactionId },
          data: {
            status: paymentStatus,
            providerReference,
            paymentReference: providerReference,
            metadata: this.toJsonValue({
              lastWebhookPayload: payload,
            }),
          },
        }),
      );
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }
  }

  private async recordWebhookEvent(
    payload: unknown,
    state: string | undefined,
    providerReference: string | undefined,
    paymentTransactionId: number | undefined,
    method: PaymentMethod,
  ) {
    await this.prisma.paymentWebhookEvent.create({
      data: {
        paymentTransactionId,
        method,
        status: this.mapWebhookStateToPaymentStatus(state),
        eventType: state || 'UNKNOWN',
        providerReference,
        payload: this.toJsonValue(payload),
        processedAt: new Date(),
      },
    });
  }

  private mapWebhookStateToPaymentStatus(state: string | undefined): PaymentStatus | null {
    switch (state) {
      case 'COMPLETE':
        return PaymentStatus.CONFIRMED;
      case 'FAILED':
        return PaymentStatus.FAILED;
      case 'PROCESSING':
        return PaymentStatus.PROCESSING;
      case 'PENDING':
        return PaymentStatus.PENDING;
      default:
        return null;
    }
  }

  async getCurrentSubscription(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = this.resolveTargetSchoolId(actor, schoolId);
    const [school, pricing, latestSubscription, latestLedger, tokenAggregate] = await Promise.all([
      this.prisma.school.findUnique({ where: { id: targetSchoolId } }),
      this.computePricingForSchool(targetSchoolId),
      this.prisma.subscription.findFirst({
        where: { schoolId: targetSchoolId },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.aIUsageLedger.findFirst({
        where: { schoolId: targetSchoolId },
        orderBy: { billingPeriodEnd: 'desc' },
      }),
      this.prisma.aiUsageLog.aggregate({
        where: { schoolId: targetSchoolId },
        _sum: { totalTokens: true },
      }),
    ]);

    if (!school) throw new NotFoundException('School not found');

    const allocatedTokens =
      latestLedger?.metadata && typeof latestLedger.metadata === 'object' && !Array.isArray(latestLedger.metadata)
        ? Number((latestLedger.metadata as Record<string, unknown>).allocatedTokens ?? 0) || null
        : null;
    const tokensUsed = tokenAggregate._sum.totalTokens ?? latestLedger?.totalTokens ?? 0;

    return {
      school,
      pricing,
      subscription: latestSubscription,
      aiUsage: {
        allocatedTokens,
        usedTokens: tokensUsed,
        remainingTokens: allocatedTokens === null ? null : Math.max(allocatedTokens - tokensUsed, 0),
        billingPeriodStart: latestLedger?.billingPeriodStart ?? null,
        billingPeriodEnd: latestLedger?.billingPeriodEnd ?? null,
      },
    };
  }

  async getInvoices(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;
    return this.prisma.invoice.findMany({
      where: targetSchoolId ? { schoolId: targetSchoolId } : undefined,
      include: {
        school: {
          select: { id: true, name: true, code: true },
        },
        paymentTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransactions(
    actor: AuthenticatedUser,
    options?: { schoolId?: number; status?: PaymentStatus; method?: PaymentMethod },
  ) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? options?.schoolId : actor.schoolId;
    return this.prisma.paymentTransaction.findMany({
      where: {
        schoolId: targetSchoolId,
        status: options?.status,
        method: options?.method,
      },
      include: {
        school: {
          select: { id: true, name: true, code: true },
        },
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveTransaction(id: number, actor: AuthenticatedUser) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: { invoice: true, school: true },
    });
    if (!transaction || !transaction.invoice) throw new NotFoundException('Payment transaction not found');
    if (actor.role !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only platform admins can approve payments');
    }
    if (transaction.status === PaymentStatus.CONFIRMED) return transaction;
    if (transaction.status === PaymentStatus.REJECTED || transaction.status === PaymentStatus.CANCELLED) {
      throw new BadRequestException('Rejected or cancelled payments cannot be approved');
    }

    await this.activateSubscription(transaction.schoolId, {
      planName: transaction.invoice.planSnapshot || 'Subscription',
      amountKES: transaction.amountKES,
      studentCount: transaction.invoice.studentCountSnapshot ?? 0,
      schoolType: (transaction.invoice.schoolTypeSnapshot as SchoolType | null) || 'DAY',
      interval: transaction.invoice.interval,
      paymentMethod: transaction.method,
      invoiceId: transaction.invoiceId ?? undefined,
      paymentTransactionId: transaction.id,
      providerReference: transaction.paymentReference ?? transaction.providerReference ?? undefined,
      rawPayload: {
        approvedBy: actor.id,
        approvedAt: new Date().toISOString(),
      },
      verifiedById: actor.id,
    });

    return this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: { invoice: true, school: true },
    });
  }

  async rejectTransaction(id: number, actor: AuthenticatedUser, reason?: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: { invoice: true },
    });
    if (!transaction) throw new NotFoundException('Payment transaction not found');
    if (actor.role !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only platform admins can reject payments');
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.paymentTransaction.update({
        where: { id },
        data: {
          status: PaymentStatus.REJECTED,
          verifiedById: actor.id,
          verifiedAt: now,
          rejectedAt: now,
          rejectionReason: reason || 'Payment verification was rejected by the platform admin.',
        },
      }),
      ...(transaction.invoiceId
        ? [
            this.prisma.invoice.update({
              where: { id: transaction.invoiceId },
              data: {
                status: InvoiceStatus.ISSUED,
                metadata: this.toJsonValue({
                  rejectionReason: reason || null,
                  rejectedAt: now.toISOString(),
                }),
              },
            }),
          ]
        : []),
    ]);

    return this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: { invoice: true, school: true },
    });
  }

  async getBillingDashboard() {
    const [confirmedRevenue, activeSubscriptions, pendingPayments, overdueInvoices] = await Promise.all([
      this.prisma.paymentTransaction.aggregate({
        where: { status: PaymentStatus.CONFIRMED },
        _sum: { amountKES: true },
      }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.paymentTransaction.count({ where: { status: PaymentStatus.AWAITING_VERIFICATION } }),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.OVERDUE } }),
    ]);

    return {
      totalRevenueKES: confirmedRevenue._sum.amountKES ?? 0,
      activeSubscriptions,
      pendingPayments,
      overdueAccounts: overdueInvoices,
    };
  }

  async getReconciliation() {
    const [invoiceStats, paymentStats, subscriptionStats, unreconciledInvoices] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['status'],
        _count: { status: true },
        _sum: { amountKES: true },
      }),
      this.prisma.paymentTransaction.groupBy({
        by: ['status'],
        _count: { status: true },
        _sum: { amountKES: true },
      }),
      this.prisma.subscription.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.invoice.findMany({
        where: {
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE] },
          paymentTransactions: {
            none: {
              status: PaymentStatus.CONFIRMED,
            },
          },
        },
        include: {
          school: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      invoices: invoiceStats,
      payments: paymentStats,
      subscriptions: subscriptionStats,
      unreconciledInvoices,
    };
  }

  async getAiUsageBillingVisibility(actor: AuthenticatedUser, schoolId?: number) {
    if (actor.role === Role.SCHOOL_ADMIN) {
      const current = await this.getCurrentSubscription(actor, schoolId);
      return {
        scope: 'school',
        schoolId: current.school.id,
        schoolName: current.school.name,
        allocatedTokens: current.aiUsage.allocatedTokens,
        tokensUsed: current.aiUsage.usedTokens,
        remainingTokens: current.aiUsage.remainingTokens,
        billingPeriodStart: current.aiUsage.billingPeriodStart,
        billingPeriodEnd: current.aiUsage.billingPeriodEnd,
      };
    }

    const [ledgerBySchool, usageBySchool, totalUsage] = await Promise.all([
      this.prisma.aIUsageLedger.findMany({
        include: {
          school: { select: { id: true, name: true, code: true } },
        },
        orderBy: { billingPeriodEnd: 'desc' },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['schoolId'],
        _sum: { totalTokens: true },
      }),
      this.prisma.aiUsageLog.aggregate({
        _sum: { totalTokens: true },
      }),
    ]);

    const schools = await this.prisma.school.findMany({
      where: { id: { in: usageBySchool.map((row) => row.schoolId) } },
      select: { id: true, name: true, code: true },
    });

    return {
      scope: 'platform',
      totalTokensUsed: totalUsage._sum.totalTokens ?? 0,
      usageByFeature: [
        {
          feature: 'AI Assignment Generation',
          tokensUsed: totalUsage._sum.totalTokens ?? 0,
        },
      ],
      usageBySchool: usageBySchool.map((row) => ({
        schoolId: row.schoolId,
        schoolName: schools.find((school) => school.id === row.schoolId)?.name ?? `School ${row.schoolId}`,
        tokensUsed: row._sum.totalTokens ?? 0,
      })),
      ledger: ledgerBySchool,
    };
  }

  private async loadInvoiceForAccess(invoiceId: number, actor: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        school: true,
        subscription: true,
        paymentTransactions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    this.assertTenant(invoice.schoolId, actor);
    return invoice;
  }

  private async buildInvoicePdf(invoiceId: number, actor: AuthenticatedUser) {
    const invoice = await this.loadInvoiceForAccess(invoiceId, actor);
    const fileName = `${invoice.invoiceNumber}.pdf`;
    const filePath = join(this.invoiceStorageDir, fileName);
    await fs.mkdir(this.invoiceStorageDir, { recursive: true });

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    const endPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(24).fillColor('#101820').text('Assignment Hub Invoice');
    doc.moveDown();
    doc.fontSize(11).fillColor('#475569');
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
    doc.text(`School: ${invoice.school.name}`);
    doc.text(`Plan: ${invoice.planSnapshot ?? 'Subscription'}`);
    doc.text(`Student Count Snapshot: ${invoice.studentCountSnapshot ?? 0}`);
    doc.text(`Amount Due: KES ${invoice.amountKES.toLocaleString()}`);
    doc.text(`Payment Method: ${invoice.paymentMethod ?? 'Pending selection'}`);
    doc.text(`Issue Date: ${invoice.issuedAt ? new Date(invoice.issuedAt).toDateString() : 'Not issued'}`);
    doc.text(`Due Date: ${invoice.dueAt ? new Date(invoice.dueAt).toDateString() : 'Not set'}`);
    doc.text(`Status: ${invoice.status}`);
    doc.moveDown();
    doc.fontSize(13).fillColor('#101820').text('Payment Activity');
    doc.moveDown(0.5);

    if (invoice.paymentTransactions.length === 0) {
      doc.fontSize(10).fillColor('#64748B').text('No payment transactions recorded yet.');
    } else {
      invoice.paymentTransactions.forEach((transaction) => {
        doc.fontSize(10).fillColor('#334155');
        doc.text(
          `${transaction.method} | ${transaction.status} | KES ${transaction.amountKES.toLocaleString()} | Reference: ${
            transaction.paymentReference ?? transaction.providerReference ?? 'Pending'
          }`,
        );
      });
    }

    doc.end();
    const buffer = await endPromise;
    await fs.writeFile(filePath, buffer);

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfPath: filePath },
    });

    return { buffer, fileName, filePath };
  }

  async downloadInvoice(invoiceId: number, actor: AuthenticatedUser) {
    return this.buildInvoicePdf(invoiceId, actor);
  }

  getPublishableKey(): string {
    return this.intaSendProvider.getPublishableKey();
  }
}
