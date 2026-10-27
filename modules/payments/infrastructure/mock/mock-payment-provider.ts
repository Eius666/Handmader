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
};
