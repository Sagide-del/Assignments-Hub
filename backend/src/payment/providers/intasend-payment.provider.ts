import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  PaymentProvider,
  PaymentProviderCheckoutRequest,
  PaymentProviderCheckoutResult,
} from './payment-provider.interface';

@Injectable()
export class IntaSendPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(IntaSendPaymentProvider.name);
  private readonly publishableKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.publishableKey = this.configService.get('INTASEND_PUBLISHABLE_KEY') || '';
    this.secretKey = this.configService.get('INTASEND_SECRET_KEY') || '';
    const testMode = this.configService.get('INTASEND_TEST_MODE') === 'true';
    this.baseUrl = testMode
      ? 'https://sandbox.intasend.com/api/v1'
      : 'https://payment.intasend.com/api/v1';
  }

  async createCheckout(input: PaymentProviderCheckoutRequest): Promise<PaymentProviderCheckoutResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/checkout/`,
        {
          public_key: this.publishableKey,
          amount: input.amountKES,
          currency: input.currency,
          email: input.email,
          api_ref: input.apiRef,
          host: input.host,
          redirect_url: input.redirectUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const rawResponse = (response.data ?? {}) as Record<string, unknown>;
      const checkoutUrl =
        typeof rawResponse.checkout_url === 'string'
          ? rawResponse.checkout_url
          : typeof rawResponse.url === 'string'
            ? rawResponse.url
            : undefined;
      const providerReference =
        typeof rawResponse.invoice_id === 'string'
          ? rawResponse.invoice_id
          : typeof rawResponse.id === 'string'
            ? rawResponse.id
            : undefined;

      return {
        rawResponse,
        providerReference,
        checkoutUrl,
      };
    } catch (error) {
      this.logger.error('IntaSend payment error:', error.response?.data || error.message);
      throw error;
    }
  }

  async verifyPayment(reference: string): Promise<unknown> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/checkout/details/`,
        { invoice_id: reference },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
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

  getPublishableKey(): string {
    return this.publishableKey;
  }
}
