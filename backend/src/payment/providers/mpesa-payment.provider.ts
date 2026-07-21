import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderCheckoutRequest,
  PaymentProviderCheckoutResult,
} from './payment-provider.interface';

@Injectable()
export class MpesaPaymentProvider implements PaymentProvider {
  async createCheckout(input: PaymentProviderCheckoutRequest): Promise<PaymentProviderCheckoutResult> {
    return {
      rawResponse: {
        providerReady: false,
        method: 'MPESA',
        message: 'M-Pesa API integration is prepared in the billing architecture but not yet connected to a live provider.',
        amountKES: input.amountKES,
        payerHint: input.email,
      },
    };
  }

  async verifyPayment(reference: string): Promise<unknown> {
    return {
      providerReady: false,
      method: 'MPESA',
      reference,
      message: 'M-Pesa verification is not yet connected to a live provider.',
    };
  }
}
