import { DomainError } from '../../shared/domain/domain-error.ts';

export interface SettlementOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  status: string;
  disputeStatus?: string;
  settlementStatus?: string;
}

export interface SettlementPaymentSnapshot {
  status: string;
  testMode: boolean;
  currency: string;
  grossAmountMinor: number;
  masterAmountMinor: number;
  commissionAmountMinor: number;
  settlementStatus?: string;
}

export interface SettlementDecisionSnapshot {
  status: string;
  resolution?: string;
  customerRefundAmountMinor?: number;
  masterPayoutAmountMinor?: number;
  platformFeeAmountMinor?: number;
}

export function decideTestSettlement(
  order: SettlementOrderSnapshot,
  payment: SettlementPaymentSnapshot,
  dispute: SettlementDecisionSnapshot | null,
) {
  if (!order.selectedMasterId) throw new DomainError('INVALID_STATE', 'В заказе не выбран мастер');
  if (!payment.testMode || payment.status !== 'funded' || payment.currency !== 'RUB') {
    throw new DomainError('INVALID_STATE', 'Доступен только тестовый расчёт зарезервированной суммы');
  }
  if (payment.settlementStatus === 'completed' || order.settlementStatus === 'completed') {
    throw new DomainError('INVALID_STATE', 'Тестовый расчёт уже выполнен');
  }
  if (order.disputeStatus === 'open') throw new DomainError('INVALID_STATE', 'Сначала нужно разрешить открытый спор');

  let customerRefundAmountMinor = 0;
  let masterPayoutAmountMinor = payment.masterAmountMinor;
  let platformFeeAmountMinor = payment.commissionAmountMinor;
  if (order.disputeStatus?.startsWith('resolved_')) {
    if (!dispute || dispute.status !== 'resolved') throw new DomainError('INVALID_STATE', 'Решение спора не найдено');
    customerRefundAmountMinor = money(dispute.customerRefundAmountMinor);
    masterPayoutAmountMinor = money(dispute.masterPayoutAmountMinor);
    platformFeeAmountMinor = money(dispute.platformFeeAmountMinor);
  } else if (order.status !== 'accepted') {
    throw new DomainError('INVALID_STATE', 'Без спора расчёт доступен только после приёмки изделия');
  }
  if (customerRefundAmountMinor + masterPayoutAmountMinor + platformFeeAmountMinor !== payment.grossAmountMinor) {
    throw new DomainError('INVALID_STATE', 'Решение не распределяет всю тестовую сумму');
  }
  const outcome: 'completed' | 'refunded' | 'partially_refunded' = customerRefundAmountMinor === 0
    ? 'completed'
    : customerRefundAmountMinor === payment.grossAmountMinor
      ? 'refunded'
      : 'partially_refunded';
  return {
    orderId: order.id,
    customerId: order.customerId,
    masterId: order.selectedMasterId,
    currency: 'RUB' as const,
    grossAmountMinor: payment.grossAmountMinor,
    customerRefundAmountMinor,
    masterPayoutAmountMinor,
    platformFeeAmountMinor,
    outcome,
  };
}

function money(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new DomainError('INVALID_STATE', 'В решении спора некорректная сумма');
  return Number(value);
}
