import { DomainError } from '../../shared/domain/domain-error.ts';

export type MaterialAdvanceStatus = 'requested' | 'authorized' | 'evidence_submitted';

export interface MaterialAdvanceOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  status: string;
  paymentStatus?: string;
  finalPrice?: number;
}

export interface MaterialAdvanceSnapshot {
  status: MaterialAdvanceStatus;
  requestedAmountMinor: number;
}

export function decideMaterialAdvanceRequest(
  order: MaterialAdvanceOrderSnapshot,
  actorId: string,
  requestedAmountMinor: unknown,
): { requestedAmountMinor: number; maximumAmountMinor: number } {
  if (!order.selectedMasterId || actorId !== order.selectedMasterId) {
    throw new DomainError('FORBIDDEN', 'Запросить аванс может только выбранный мастер');
  }
  if (order.paymentStatus !== 'funded' || !['paid', 'in_progress'].includes(order.status)) {
    throw new DomainError('INVALID_STATE', 'Аванс доступен только после подтверждённой тестовой оплаты');
  }
  if (typeof order.finalPrice !== 'number'
    || !Number.isSafeInteger(order.finalPrice)
    || order.finalPrice < 100) {
    throw new DomainError('INVALID_STATE', 'В заказе нет корректной итоговой цены');
  }
  if (typeof requestedAmountMinor !== 'number'
    || !Number.isSafeInteger(requestedAmountMinor)
    || requestedAmountMinor <= 0) {
    throw new DomainError('VALIDATION_ERROR', 'Укажите корректную сумму аванса');
  }

  const maximumAmountMinor = Math.floor((order.finalPrice * 100) / 2);
  if (requestedAmountMinor > maximumAmountMinor) {
    throw new DomainError('VALIDATION_ERROR', 'Аванс не может превышать 50% итоговой цены');
  }
  return { requestedAmountMinor, maximumAmountMinor };
}

export function decideMaterialAdvanceAuthorization(
  order: MaterialAdvanceOrderSnapshot,
  advance: MaterialAdvanceSnapshot,
  actorId: string,
): { status: 'authorized' } {
  if (actorId !== order.customerId) {
    throw new DomainError('FORBIDDEN', 'Подтвердить аванс может только заказчик');
  }
  if (order.paymentStatus !== 'funded' || !['paid', 'in_progress'].includes(order.status)) {
    throw new DomainError('INVALID_STATE', 'Состояние заказа не позволяет подтвердить аванс');
  }
  if (advance.status !== 'requested') {
    throw new DomainError('INVALID_STATE', 'Этот запрос аванса уже обработан');
  }
  return { status: 'authorized' };
}

export function decideMaterialExpenseEvidence(
  order: MaterialAdvanceOrderSnapshot,
  advance: MaterialAdvanceSnapshot,
  actorId: string,
  input: { spentAmountMinor: unknown; note: unknown },
): { status: 'evidence_submitted'; spentAmountMinor: number; unusedAmountMinor: number; note: string } {
  if (!order.selectedMasterId || actorId !== order.selectedMasterId) {
    throw new DomainError('FORBIDDEN', 'Подтверждение расходов добавляет выбранный мастер');
  }
  if (advance.status !== 'authorized') {
    throw new DomainError('INVALID_STATE', 'Сначала заказчик должен подтвердить аванс');
  }
  if (typeof input.spentAmountMinor !== 'number'
    || !Number.isSafeInteger(input.spentAmountMinor)
    || input.spentAmountMinor < 0
    || input.spentAmountMinor > advance.requestedAmountMinor) {
    throw new DomainError('VALIDATION_ERROR', 'Сумма расходов должна быть в пределах подтверждённого аванса');
  }
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (note.length < 10 || note.length > 2_000) {
    throw new DomainError('VALIDATION_ERROR', 'Опишите покупку и подтверждение расходов (от 10 до 2000 символов)');
  }
  return {
    status: 'evidence_submitted',
    spentAmountMinor: input.spentAmountMinor,
    unusedAmountMinor: advance.requestedAmountMinor - input.spentAmountMinor,
    note,
  };
}
