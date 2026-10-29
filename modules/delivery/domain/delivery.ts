import { DomainError } from '../../shared/domain/domain-error.ts';

export const ACCEPTANCE_WINDOW_DAYS = 5;

export interface DeliveryOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  status: string;
  disputeStatus?: string;
}

export interface DeliveryAgreementSnapshot {
  status: string;
  deliveryMethod: 'local' | 'delivery';
}

export type DeliveryStatus = 'handoff_pending' | 'in_transit' | 'delivered' | 'accepted';

export interface DeliverySnapshot {
  method: 'local' | 'delivery';
  status: DeliveryStatus;
  acceptanceDueAtMs?: number;
}

export function decideDeliveryStart(
  order: DeliveryOrderSnapshot,
  agreement: DeliveryAgreementSnapshot,
  actorId: string,
  input: { carrier?: unknown; trackingNumber?: unknown },
) {
  if (!order.selectedMasterId || actorId !== order.selectedMasterId) {
    throw new DomainError('FORBIDDEN', 'Начать передачу может только выбранный мастер');
  }
  if (order.status !== 'ready' || agreement.status !== 'confirmed') {
    throw new DomainError('INVALID_STATE', 'Передача доступна только для готового заказа с подтверждёнными условиями');
  }
  if (agreement.deliveryMethod === 'local') {
    return { method: 'local' as const, status: 'handoff_pending' as const };
  }
  const carrier = normalizeText(input.carrier, 2, 100, 'Укажите перевозчика');
  const trackingNumber = normalizeText(input.trackingNumber, 3, 100, 'Укажите трек-номер');
  return { method: 'delivery' as const, status: 'in_transit' as const, carrier, trackingNumber };
}

export function decideReceiptConfirmation(
  order: DeliveryOrderSnapshot,
  delivery: DeliverySnapshot,
  actorId: string,
  nowMs: number,
) {
  if (actorId !== order.customerId) {
    throw new DomainError('FORBIDDEN', 'Получение подтверждает только заказчик');
  }
  if (order.status !== 'in_delivery'
    || !['handoff_pending', 'in_transit'].includes(delivery.status)) {
    throw new DomainError('INVALID_STATE', 'Передача ещё не начата или уже подтверждена');
  }
  return {
    status: 'delivered' as const,
    acceptanceDueAtMs: nowMs + ACCEPTANCE_WINDOW_DAYS * 24 * 60 * 60 * 1_000,
  };
}

export function decideOrderAcceptance(
  order: DeliveryOrderSnapshot,
  delivery: DeliverySnapshot,
  actorId: string,
) {
  if (actorId !== order.customerId) {
    throw new DomainError('FORBIDDEN', 'Принять изделие может только заказчик');
  }
  requireAcceptable(order, delivery);
  return { status: 'accepted' as const, automatic: false };
}

export function decideAutomaticAcceptance(
  order: DeliveryOrderSnapshot,
  delivery: DeliverySnapshot,
  nowMs: number,
) {
  requireAcceptable(order, delivery);
  if (!delivery.acceptanceDueAtMs || delivery.acceptanceDueAtMs > nowMs) {
    throw new DomainError('INVALID_STATE', 'Срок автоматической приёмки ещё не наступил');
  }
  return { status: 'accepted' as const, automatic: true };
}

function requireAcceptable(order: DeliveryOrderSnapshot, delivery: DeliverySnapshot) {
  if (order.status !== 'delivered' || delivery.status !== 'delivered') {
    throw new DomainError('INVALID_STATE', 'Сначала подтвердите получение изделия');
  }
  if (order.disputeStatus) {
    throw new DomainError('INVALID_STATE', 'Заказ со спором нельзя принять');
  }
}

function normalizeText(value: unknown, min: number, max: number, message: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min || text.length > max) throw new DomainError('VALIDATION_ERROR', message);
  return text;
}
