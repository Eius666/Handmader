import 'server-only';

import type { PaymentProvider } from '../../application/payment-provider';

export const mockPaymentProvider: PaymentProvider = {
  async fund(input) {
    return {
      provider: 'mock',
      providerPaymentId: `mock_${input.orderId}_${input.idempotencyKey}`,
      status: 'funded',
    };
  },
  async payout(input) {
    return {
      provider: 'mock',
      providerPayoutId: `mock_payout_${input.orderId}_${input.idempotencyKey}`,
      status: 'completed',
    };
  },
  async refund(input) {
    return {
      provider: 'mock',
      providerRefundId: `mock_refund_${input.orderId}_${input.idempotencyKey}`,
      status: 'completed',
    };
  },
};
