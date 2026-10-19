import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { PaymentProvider, PaymentProviderCheckoutRequest, PaymentProviderCheckoutResult } from './payment-provider.interface';

@Injectable()
export class PaystackPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(PaystackPaymentProvider.name);
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY')?.trim() || '';
    this.publicKey = this.configService.get<string>('PAYSTACK_PUBLIC_KEY')?.trim() || '';
  }

  isConfigured() {
    return Boolean(this.secretKey);
  }

  getPublicKey() {
    return this.publicKey;
  }

  verifyWebhookSignature(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!this.secretKey || !rawBody || !signature) return false;

    const expected = crypto.createHmac('sha512', this.secretKey).update(rawBody).digest();
    const received = Buffer.from(signature, 'hex');
    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
  }

  async createCheckout(input: PaymentProviderCheckoutRequest): Promise<PaymentProviderCheckoutResult> {
    if (!this.secretKey) throw new BadRequestException('Paystack is not configured. Set PAYSTACK_SECRET_KEY in the API environment.');
    try {
      const response = await axios.post('https://api.paystack.co/transaction/initialize', {
        email: input.email,
        amount: input.amountKES * 100,
        currency: input.currency,
        reference: input.apiRef,
        callback_url: input.redirectUrl,
        metadata: { assignmentHubReference: input.apiRef },
      }, { headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' } });
      const data = response.data?.data ?? {};
      return {
        rawResponse: response.data as Record<string, unknown>,
        providerReference: typeof data.reference === 'string' ? data.reference : input.apiRef,
        checkoutUrl: typeof data.authorization_url === 'string' ? data.authorization_url : undefined,
      };
    } catch (error: any) {
      this.logger.error('Paystack checkout initialization failed', error.response?.data || error.message);
      throw error;
    }
  }

  async verifyPayment(reference: string): Promise<unknown> {
    if (!this.secretKey) throw new BadRequestException('Paystack is not configured.');
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    return response.data;
  }
}
