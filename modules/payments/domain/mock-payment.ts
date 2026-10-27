import { DomainError } from '../../shared/domain/domain-error.ts';

export const CLOSED_BETA_COMMISSION_BPS = 1_000;

export interface PayableOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  status: string;
  agreementStatus?: string;
  finalPrice?: number;
}

export interface MockPaymentDecision {
  orderId: string;
  customerId: string;
  masterId: string;
  currency: 'RUB';
  grossAmountMinor: number;
  commissionBps: number;
  commissionAmountMinor: number;
  masterAmountMinor: number;
}

export function decideMockPayment(
  order: PayableOrderSnapshot,
  actorId: string,
): MockPaymentDecision {
  if (actorId !== order.customerId) {
    throw new DomainError('FORBIDDEN', 'Тестовую оплату запускает заказчик');
  }
  if (!order.selectedMasterId) {
    throw new DomainError('INVALID_STATE', 'Для заказа не выбран мастер');
  }
  if (order.status !== 'awaiting_payment' || order.agreementStatus !== 'confirmed') {
    throw new DomainError('INVALID_STATE', 'Перед оплатой обе стороны должны подтвердить условия');
  }
  if (typeof order.finalPrice !== 'number'
    || !Number.isSafeInteger(order.finalPrice)
    || order.finalPrice < 100) {
    throw new DomainError('INVALID_STATE', 'В соглашении нет корректной итоговой цены');
  }
  const grossAmountMinor = order.finalPrice * 100;
  if (!Number.isSafeInteger(grossAmountMinor)) {
    throw new DomainError('INVALID_STATE', 'Итоговая сумма слишком велика');
  }
  const commissionAmountMinor = Math.round(
    (grossAmountMinor * CLOSED_BETA_COMMISSION_BPS) / 10_000,
  );
  return {
    orderId: order.id,
    customerId: order.customerId,
    masterId: order.selectedMasterId,
    currency: 'RUB',
    grossAmountMinor,
    commissionBps: CLOSED_BETA_COMMISSION_BPS,
    commissionAmountMinor,
    masterAmountMinor: grossAmountMinor - commissionAmountMinor,
  };
}
