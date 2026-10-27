import { DomainError } from '../../shared/domain/domain-error.ts';

export type OrderTransitionAction = 'start_work' | 'mark_ready' | 'confirm_delivery';

export interface TransitionableOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  status: string;
}

export interface OrderTransitionDecision {
  action: OrderTransitionAction;
  previousStatus: string;
  nextStatus: 'in_progress' | 'ready' | 'completed';
  notifyUserId: string;
}

export function decideOrderTransition(
  order: TransitionableOrderSnapshot,
  actorId: string,
  action: OrderTransitionAction,
): OrderTransitionDecision {
  if (!order.selectedMasterId) {
    throw new DomainError('INVALID_STATE', 'Для заказа не выбран мастер');
  }

  switch (action) {
    case 'start_work':
      requireActor(actorId, order.selectedMasterId, 'Только выбранный мастер может начать работу');
      requireStatus(order.status, ['master_selected']);
      return {
        action,
        previousStatus: order.status,
        nextStatus: 'in_progress',
        notifyUserId: order.customerId,
      };

    case 'mark_ready':
      requireActor(actorId, order.selectedMasterId, 'Только выбранный мастер может отметить заказ готовым');
      requireStatus(order.status, ['in_progress']);
      return {
        action,
        previousStatus: order.status,
        nextStatus: 'ready',
        notifyUserId: order.customerId,
      };

    case 'confirm_delivery':
      requireActor(actorId, order.customerId, 'Только заказчик может подтвердить получение');
      requireStatus(order.status, ['ready', 'delivered']);
      return {
        action,
        previousStatus: order.status,
        nextStatus: 'completed',
        notifyUserId: order.selectedMasterId,
      };
  }
}

function requireActor(actual: string, expected: string, message: string): void {
  if (actual !== expected) throw new DomainError('FORBIDDEN', message);
}

function requireStatus(actual: string, allowed: string[]): void {
  if (!allowed.includes(actual)) {
    throw new DomainError('INVALID_STATE', 'Недопустимый переход состояния заказа');
  }
}
