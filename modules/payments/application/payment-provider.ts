export interface PaymentProviderResult {
  provider: string;
  providerPaymentId: string;
  status: 'funded';
}

export interface PaymentProviderPayoutResult {
  provider: string;
  providerPayoutId: string;
  status: 'completed';
}

export interface PaymentProviderRefundResult {
  provider: string;
  providerRefundId: string;
  status: 'completed';
}

export interface PaymentProvider {
  fund(input: {
    orderId: string;
    amountMinor: number;
    currency: 'RUB';
    idempotencyKey: string;
  }): Promise<PaymentProviderResult>;
  payout(input: {
    paymentId: string;
    orderId: string;
    recipientId: string;
    amountMinor: number;
    currency: 'RUB';
    idempotencyKey: string;
  }): Promise<PaymentProviderPayoutResult>;
  refund(input: {
    paymentId: string;
    orderId: string;
    amountMinor: number;
    currency: 'RUB';
    idempotencyKey: string;
  }): Promise<PaymentProviderRefundResult>;
}
