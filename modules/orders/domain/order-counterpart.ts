import { DomainError } from '../../shared/domain/domain-error.ts';

export interface OrderCounterpartSnapshot {
  customerId: string;
  customerName: string;
  selectedMasterId?: string;
  selectedMasterName?: string;
}

export interface OrderCounterpart {
  role: 'customer' | 'master';
  name: string;
}

export function getOrderCounterpart(
  order: OrderCounterpartSnapshot,
  actorId: string,
): OrderCounterpart {
  if (actorId === order.customerId && order.selectedMasterId) {
    return { role: 'master', name: order.selectedMasterName || 'Мастер' };
  }
  if (actorId === order.selectedMasterId) {
    return { role: 'customer', name: order.customerName || 'Заказчик' };
  }
  throw new DomainError('FORBIDDEN', 'Контрагент доступен только участникам заказа');
}
