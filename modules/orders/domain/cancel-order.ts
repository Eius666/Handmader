import { DomainError } from '../../shared/domain/domain-error.ts';

export interface CancellableOrderSnapshot {
  id: string;
  customerId: string;
  status: string;
}

export interface CancelOrderDecision {
  previousStatus: string;
  nextStatus: 'cancelled';
}

export function decideOrderCancellation(
  order: CancellableOrderSnapshot,
  actorId: string,
): CancelOrderDecision {
  if (actorId !== order.customerId) {
    throw new DomainError('FORBIDDEN', 'Отменить заказ может только заказчик');
  }
  if (order.status !== 'awaiting_responses') {
    throw new DomainError(
      'INVALID_STATE',
      'После выбора мастера отмена оформляется через поддержку',
    );
  }

  return {
    previousStatus: order.status,
    nextStatus: 'cancelled',
  };
}
