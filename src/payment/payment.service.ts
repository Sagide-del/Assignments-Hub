import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';
import { Role } from '../common/enums/role.enum';
import { computeMonthlyPriceKES, ComputedPricing, SchoolType } from '../common/config/plans';

interface SubscriptionActivationData {
  planName: string;
  amountKES: number;
  studentCount: number;
  schoolType: SchoolType;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly publishableKey: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;

  // The full pricing snapshot computed at checkout time gets encoded into
  // api_ref (not a real "metadata" field — see comment on handleWebhook
  // below) so the webhook can recover it without a DB lookup keyed on
  // anything but our own reference string, AND so it can validate the
  // payment against the EXACT numbers quoted at checkout time rather than
  // whatever the school's student count happens to be when the webhook
  // fires (which could have changed in between). Base64url-encoding the
  // JSON payload (rather than hyphen-joining raw values) means plan names
  // containing "-", "_", etc. can never corrupt the parse — api_ref is
  // opaque to IntaSend, so format is entirely ours.
  private buildApiRef(kind: 'SCHOOL' | 'SUB', schoolId: number, pricing: ComputedPricing, interval?: string) {
    const payload = {
      k: kind,
      s: schoolId,
      p: pricing.tier.name,
      a: pricing.amountKES,
      c: pricing.studentCount,
      y: pricing.schoolType,
      i: interval,
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
    interval?: string;
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
        interval: typeof payload.i === 'string' ? payload.i : undefined,
      };
    } catch {
      return {};
    }
  }

  constructor(
    private configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.publishableKey = this.configService.get('INTASEND_PUBLISHABLE_KEY') || '';
    this.secretKey = this.configService.get('INTASEND_SECRET_KEY') || '';
    // This holds the "challenge" string configured on the IntaSend dashboard
    // webhook page, NOT an HMAC signing secret — IntaSend echoes it back
    // verbatim inside the webhook JSON body as `challenge`.
    //
    // Deliberately NO hardcoded fallback here: a previous version of this
    // file defaulted to a fixed string when the env var was unset, which
    // meant anyone who could read the source (or find that string committed
    // in a .env anywhere) could forge a `state: 'COMPLETE'` webhook and
    // activate a paid subscription for free. If this is unset,
    // verifyWebhookChallenge() below fails closed — every webhook call is
    // rejected — rather than silently trusting a known-to-everyone secret.
    this.webhookSecret = this.configService.get('INTASEND_WEBHOOK_SECRET') || '';
    if (!this.webhookSecret) {
      this.logger.warn(
        'INTASEND_WEBHOOK_SECRET is not set — all incoming IntaSend webhooks will be rejected, so paid subscriptions will never auto-activate. Set it in .env to the challenge string configured on the IntaSend dashboard.',
      );
    }
    const testMode = this.configService.get('INTASEND_TEST_MODE') === 'true';
    // Confirmed against developers.intasend.com/docs/authentication — the
    // live API host is payment.intasend.com, NOT api.intasend.com (the old
    // value here was simply wrong and would fail DNS/connect, not auth).
    this.baseUrl = testMode
      ? 'https://sandbox.intasend.com/api/v1'
      : 'https://payment.intasend.com/api/v1';
  }

  /**
   * The ONLY place a school's plan/price is decided. Never trust anything a
   * client sends for this — the tier is resolved automatically from the
   * school's live registered student count (User rows with role STUDENT),
   * priced per-student at the rate for the school's declared type (Day vs
   * Boarding — see School.type). See backend/src/common/config/plans.ts for
   * the tier bands and rates themselves.
   */
  private async computePricingForSchool(schoolId: number): Promise<ComputedPricing> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new BadRequestException('School not found');
    const studentCount = await this.prisma.user.count({ where: { schoolId, role: Role.STUDENT } });
    return computeMonthlyPriceKES(studentCount, school.type as SchoolType);
  }

  /** Public wrapper so the controller can expose "what would this school pay right now" without starting a checkout. */
  async getPricingForSchool(schoolId: number): Promise<ComputedPricing> {
    return this.computePricingForSchool(schoolId);
  }

  // amount is intentionally never a parameter here — it's always computed
  // server-side via computePricingForSchool. Trusting a client-supplied
  // amount (or plan) would let a caller check out for KES 1 and, once the
  // webhook confirms that KES 1 payment, get a full-price plan activated.
  async createPayment(email: string, schoolId: number) {
    const pricing = await this.computePricingForSchool(schoolId);

    // Free tier (under 50 students) has nothing to charge — IntaSend
    // doesn't support a KES 0 checkout, and there's no reason to round-trip
    // a free plan through a payment provider anyway. Activate it directly.
    if (pricing.amountKES <= 0) {
      await this.activateSubscription(schoolId, {
        planName: pricing.tier.name,
        amountKES: pricing.amountKES,
        studentCount: pricing.studentCount,
        schoolType: pricing.schoolType,
      });
      return {
        free: true,
        tier: pricing.tier.name,
        studentCount: pricing.studentCount,
        message: `This school qualifies for the Free tier (${pricing.studentCount} students) — activated with no payment required.`,
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/checkout/`,
        {
          // Checkout Link API authenticates primarily via public_key in the
          // body (per IntaSend's Authentication docs: "the checkout link API
          // ... needs only the public key to generate"). The old payload was
          // missing this field entirely.
          public_key: this.publishableKey,
          amount: pricing.amountKES, // plain decimal (e.g. 12000 for KES 12,000) — NOT cents
          currency: 'KES',
          email,
          api_ref: this.buildApiRef('SCHOOL', schoolId, pricing),
          host: this.configService.get('APP_URL') || undefined,
          redirect_url: this.configService.get('PAYMENT_REDIRECT_URL') || undefined,
        },
        {
          headers: {
            // Secret key isn't strictly required for this endpoint, but
            // sending it is harmless and matches IntaSend's own SDK
            // behaviour when a secret key is available server-side.
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error('IntaSend payment error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Looks up a checkout's status by invoice_id. NOTE: IntaSend's official
   * SDKs expose this as collection.status(invoice_id) but the underlying
   * REST path isn't published in the public API docs, so this is a
   * best-effort implementation. The webhook (handleWebhook below) is the
   * authoritative source of truth for activating a subscription — this
   * method is only used for an optional "check status now" UI affordance.
   */
  async verifyPayment(invoiceId: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/checkout/details/`,
        { invoice_id: invoiceId },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error('IntaSend verification error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * There is no documented recurring-subscription REST endpoint for
   * checkout — IntaSend's "Subscriptions" product is a separate,
   * plan/customer-based API. Since this app only needs "charge the school
   * now, activate the plan for one interval on webhook confirmation", we
   * reuse the same checkout link flow as createPayment and just encode the
   * interval into api_ref so it's available if/when recurring billing is
   * built out for real.
   */
  async createSubscription(email: string, schoolId: number, interval: string = 'monthly') {
    const pricing = await this.computePricingForSchool(schoolId);

    if (pricing.amountKES <= 0) {
      await this.activateSubscription(schoolId, {
        planName: pricing.tier.name,
        amountKES: pricing.amountKES,
        studentCount: pricing.studentCount,
        schoolType: pricing.schoolType,
      });
      return {
        free: true,
        tier: pricing.tier.name,
        studentCount: pricing.studentCount,
        message: `This school qualifies for the Free tier (${pricing.studentCount} students) — activated with no payment required.`,
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/checkout/`,
        {
          public_key: this.publishableKey,
          amount: pricing.amountKES,
          currency: 'KES',
          email,
          api_ref: this.buildApiRef('SUB', schoolId, pricing, interval),
          host: this.configService.get('APP_URL') || undefined,
          redirect_url: this.configService.get('PAYMENT_REDIRECT_URL') || undefined,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error('IntaSend subscription error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * IntaSend does NOT sign webhooks with an HMAC header. Per
   * developers.intasend.com/docs/setup, you configure a "challenge" string
   * on the dashboard when registering the webhook URL, and IntaSend echoes
   * that same string back inside the JSON body as `challenge` on every
   * event. Verification is just a string comparison against that field.
   */
  verifyWebhookChallenge(payload: any): boolean {
    return !!this.webhookSecret && payload?.challenge === this.webhookSecret;
  }

  async handleWebhook(payload: any) {
    this.logger.log('Processing IntaSend webhook...');

    if (!this.verifyWebhookChallenge(payload)) {
      this.logger.error('Invalid webhook challenge — payload.challenge did not match INTASEND_WEBHOOK_SECRET (or the secret is unset)');
      return { status: 'error', message: 'Invalid challenge' };
    }

    // Real IntaSend collection webhook payload is flat:
    // { invoice_id, state, provider, api_ref, currency, value, account, ... }
    // (see developers.intasend.com/docs/payment-collection-events). There is
    // no `event`/`data`/`metadata` wrapper. schoolId/plan/amount/etc. are
    // recovered from api_ref, which we set ourselves in createPayment /
    // createSubscription above.
    const { state, api_ref: apiRef, invoice_id: invoiceId, value, failed_reason: failedReason } = payload || {};
    const { schoolId, plan, amountKES: expectedAmount, studentCount, schoolType } = this.parseApiRef(apiRef);

    switch (state) {
      case 'COMPLETE': {
        this.logger.log(`Payment complete (invoice ${invoiceId})`);
        if (!schoolId || !plan || !expectedAmount) {
          this.logger.error(`Could not recover schoolId/plan/amount from api_ref "${apiRef}" — cannot activate a subscription automatically.`);
          return { status: 'error', message: 'Missing schoolId/plan/amount in api_ref', state };
        }

        // Defense in depth: confirm the amount IntaSend says was actually
        // paid (`value`) covers the amount we quoted at checkout time
        // (`expectedAmount`, taken from api_ref — not recomputed from the
        // school's CURRENT student count, since that could have changed
        // between checkout and webhook). This catches a tampered/short
        // payment reaching COMPLETE for any reason (e.g. a manually-crafted
        // checkout outside this app).
        const paidAmount = Number(value);
        if (!Number.isFinite(paidAmount) || paidAmount < expectedAmount) {
          this.logger.error(
            `Webhook for invoice ${invoiceId} paid ${value} but checkout was for KES ${expectedAmount} (tier "${plan}") — refusing to activate. schoolId=${schoolId}`,
          );
          return { status: 'error', message: 'Paid amount does not match quoted price', state };
        }

        await this.activateSubscription(schoolId, {
          planName: plan,
          amountKES: expectedAmount,
          studentCount: studentCount ?? 0,
          schoolType: schoolType ?? 'DAY',
        });
        return { status: 'success', message: 'Subscription activated', state };
      }

      case 'FAILED':
        this.logger.log(`Payment failed (invoice ${invoiceId}): ${failedReason || 'no reason given'}`);
        return { status: 'error', message: 'Payment failed', state };

      case 'PENDING':
      case 'PROCESSING':
        this.logger.log(`Payment ${state.toLowerCase()} (invoice ${invoiceId})`);
        return { status: 'success', message: `Payment ${state.toLowerCase()}`, state };

      default:
        this.logger.log(`Unhandled webhook state: ${state}`);
        return { status: 'success', message: 'Webhook received', state: state || 'unknown' };
    }
  }

  /**
   * Records the paid subscription (including the pricing snapshot that
   * produced the charge) and mirrors ACTIVE onto School so the rest of the
   * app (login, dashboards) reflects the confirmed payment. Mirrors
   * SubscriptionsService.create's transaction shape but lives here too since
   * this runs from an unauthenticated webhook, not a controller with a
   * CurrentUser actor.
   */
  private async activateSubscription(schoolId: number, data: SubscriptionActivationData) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      this.logger.error(`Webhook referenced unknown schoolId ${schoolId} — ignoring.`);
      return;
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await this.prisma.$transaction([
      this.prisma.subscription.create({
        data: {
          schoolId,
          plan: data.planName,
          status: SubscriptionStatus.ACTIVE,
          amountKES: data.amountKES,
          studentCount: data.studentCount,
          schoolType: data.schoolType,
          expiresAt,
        },
      }),
      this.prisma.school.update({
        where: { id: schoolId },
        data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      }),
    ]);

    this.logger.log(
      `Activated "${data.planName}" subscription for school ${schoolId} (KES ${data.amountKES}/mo, ${data.studentCount} students, ${data.schoolType}, expires ${expiresAt.toISOString()})`,
    );
  }

  getPublishableKey(): string {
    return this.publishableKey;
  }
}
