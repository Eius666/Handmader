import { DomainError } from '../../shared/domain/domain-error.ts';

export type DisputeStatus = 'open' | 'resolved';
export type DisputeResolution = 'accept_order' | 'full_refund' | 'partial_refund';

export interface DisputeOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  status: string;
  paymentStatus?: string;
  disputeStatus?: string;
}

export interface DisputeSnapshot {
  id: string;
  orderId: string;
  customerId: string;
  masterId: string;
  status: DisputeStatus;
}

export function decideDisputeOpening(order: DisputeOrderSnapshot, actorId: string, reason: unknown) {
  requireParticipant(order, actorId);
  if (order.paymentStatus !== 'funded') throw new DomainError('INVALID_STATE', 'Спор доступен после подтверждённой тестовой оплаты');
  if (order.disputeStatus === 'open') throw new DomainError('INVALID_STATE', 'По заказу уже открыт спор');
  if (!order.selectedMasterId || order.status === 'cancelled') throw new DomainError('INVALID_STATE', 'Спор нельзя открыть в текущем состоянии заказа');
  return { reason: normalizeText(reason, 20, 3_000, 'Опишите ситуацию не короче 20 символов') };
}

export function decideEvidenceAddition(dispute: DisputeSnapshot, actorId: string, description: unknown, sourceUrl: unknown) {
  if (actorId !== dispute.customerId && actorId !== dispute.masterId) throw new DomainError('FORBIDDEN', 'Доказательства могут добавлять только участники заказа');
  if (dispute.status !== 'open') throw new DomainError('INVALID_STATE', 'Спор уже закрыт');
  const normalizedDescription = normalizeText(description, 5, 2_000, 'Опишите доказательство');
  const normalizedUrl = optionalUrl(sourceUrl);
  return { description: normalizedDescription, ...(normalizedUrl ? { sourceUrl: normalizedUrl } : {}) };
}

export function decideDisputeResolution(input: {
  disputeStatus: string; resolution: unknown; decisionSummary: unknown; grossAmountMinor: number;
  customerRefundAmountMinor: unknown; masterPayoutAmountMinor: unknown; platformFeeAmountMinor: unknown;
}) {
  if (input.disputeStatus !== 'open') throw new DomainError('INVALID_STATE', 'Спор уже закрыт');
  if (!['accept_order', 'full_refund', 'partial_refund'].includes(String(input.resolution))) throw new DomainError('VALIDATION_ERROR', 'Выберите итог спора');
  const resolution = input.resolution as DisputeResolution;
  const decisionSummary = normalizeText(input.decisionSummary, 10, 4_000, 'Обоснуйте решение не короче 10 символов');
  const customerRefundAmountMinor = money(input.customerRefundAmountMinor);
  const masterPayoutAmountMinor = money(input.masterPayoutAmountMinor);
  const platformFeeAmountMinor = money(input.platformFeeAmountMinor);
  if (customerRefundAmountMinor + masterPayoutAmountMinor + platformFeeAmountMinor !== input.grossAmountMinor) throw new DomainError('VALIDATION_ERROR', 'Расчёт должен распределять всю тестовую сумму заказа');
  if (resolution === 'accept_order' && customerRefundAmountMinor !== 0) throw new DomainError('VALIDATION_ERROR', 'При принятии заказа возврат равен нулю');
  if (resolution === 'full_refund' && (customerRefundAmountMinor !== input.grossAmountMinor || masterPayoutAmountMinor !== 0 || platformFeeAmountMinor !== 0)) throw new DomainError('VALIDATION_ERROR', 'Полный возврат возвращает заказчику всю сумму');
  if (resolution === 'partial_refund' && (customerRefundAmountMinor <= 0 || customerRefundAmountMinor >= input.grossAmountMinor)) throw new DomainError('VALIDATION_ERROR', 'Частичный возврат должен быть больше нуля и меньше суммы заказа');
  return { resolution, decisionSummary, customerRefundAmountMinor, masterPayoutAmountMinor, platformFeeAmountMinor };
}

function requireParticipant(order: DisputeOrderSnapshot, actorId: string) {
  if (actorId !== order.customerId && actorId !== order.selectedMasterId) throw new DomainError('FORBIDDEN', 'Спор доступен только участникам заказа');
}
function normalizeText(value: unknown, min: number, max: number, message: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min || text.length > max) throw new DomainError('VALIDATION_ERROR', message);
  return text;
}
function optionalUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try { const url = new URL(value.trim()); if (url.protocol !== 'https:') throw new Error(); return url.toString(); }
  catch { throw new DomainError('VALIDATION_ERROR', 'Ссылка на доказательство должна начинаться с https://'); }
}
function money(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new DomainError('VALIDATION_ERROR', 'Денежные суммы должны быть указаны в копейках');
  return Number(value);
}
