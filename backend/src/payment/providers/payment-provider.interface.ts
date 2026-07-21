export interface PaymentProviderCheckoutRequest {
  email: string;
  amountKES: number;
  currency: string;
  apiRef: string;
  host?: string;
  redirectUrl?: string;
}

export interface PaymentProviderCheckoutResult {
  rawResponse: Record<string, unknown>;
  providerReference?: string;
  checkoutUrl?: string;
}

export interface PaymentProvider {
  createCheckout(input: PaymentProviderCheckoutRequest): Promise<PaymentProviderCheckoutResult>;
  verifyPayment(reference: string): Promise<unknown>;
}
