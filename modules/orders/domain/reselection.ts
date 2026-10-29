import { DomainError } from '../../shared/domain/domain-error.ts';

export interface ReselectionOrderSnapshot {
  id: string;
  customerId: string;
  status: string;
  selectedMasterId?: string;
  paymentConfirmed: boolean;
  reselectionRequestStatus?: string;
  reselectionCycle: number;
}

export interface ReselectionCaseSnapshot {
  id: string;
  orderId: string;
  customerId: string;
  previousMasterId: string;
  status: string;
  reason: string;
}

export interface ReselectionRequestDecision {
  reason: string;
  previousMasterId: string;
}

export interface ReopenSelectionDecision {
  previousMasterId: string;
  nextStatus: 'awaiting_responses';
  nextCycle: number;
}

const REQUESTABLE_STATUSES = new Set(['master_selected', 'awaiting_payment']);

export function decideReselectionRequest(
  order: ReselectionOrderSnapshot,
  actorId: string,
  rawReason: unknown,
): ReselectionRequestDecision {
  if (order.customerId !== actorId) {
    throw new DomainError('FORBIDDEN', 'Обратиться за сменой мастера может только заказчик');
  }
  if (order.paymentConfirmed) {
    throw new DomainError(
      'INVALID_STATE',
      'После оплаты смена мастера возможна только после завершения спора, отмены или возврата',
    );
  }
  if (!REQUESTABLE_STATUSES.has(order.status) || !order.selectedMasterId) {
    throw new DomainError('INVALID_STATE', 'На текущем этапе смена мастера недоступна');
  }
  if (order.reselectionRequestStatus === 'pending') {
    throw new DomainError('INVALID_STATE', 'Обращение уже находится на рассмотрении поддержки');
  }
  if (typeof rawReason !== 'string') {
    throw new DomainError('VALIDATION_ERROR', 'Укажите причину смены мастера');
  }
  const reason = rawReason.trim();
  if (reason.length < 10 || reason.length > 1_000) {
    throw new DomainError('VALIDATION_ERROR', 'Причина должна содержать от 10 до 1000 символов');
  }
  return { reason, previousMasterId: order.selectedMasterId };
}

export function decideSelectionReopen(
  order: ReselectionOrderSnapshot,
  supportCase: ReselectionCaseSnapshot,
): ReopenSelectionDecision {
  if (supportCase.orderId !== order.id || supportCase.customerId !== order.customerId) {
    throw new DomainError('INVALID_STATE', 'Обращение не соответствует заказу');
  }
  if (supportCase.status !== 'pending' || order.reselectionRequestStatus !== 'pending') {
    throw new DomainError('INVALID_STATE', 'Обращение уже обработано');
  }
  if (order.paymentConfirmed) {
    throw new DomainError(
      'INVALID_STATE',
      'После оплаты мастер меняется только после завершения спора, отмены или возврата',
    );
  }
  if (!REQUESTABLE_STATUSES.has(order.status)
    || order.selectedMasterId !== supportCase.previousMasterId) {
    throw new DomainError('INVALID_STATE', 'Состав участников заказа уже изменился');
  }
  return {
    previousMasterId: supportCase.previousMasterId,
    nextStatus: 'awaiting_responses',
    nextCycle: order.reselectionCycle + 1,
  };
}
