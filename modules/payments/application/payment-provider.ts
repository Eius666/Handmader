export interface PaymentProviderResult {
  provider: string;
  providerPaymentId: string;
  status: 'funded';
}

export interface PaymentProvider {
  fund(input: {
    orderId: string;
    amountMinor: number;
    currency: 'RUB';
    idempotencyKey: string;
  }): Promise<PaymentProviderResult>;
}
