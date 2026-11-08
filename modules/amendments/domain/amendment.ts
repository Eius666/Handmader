import { DomainError } from '../../shared/domain/domain-error.ts';

export interface AmendmentOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  status: string;
  paymentStatus?: string;
}

export interface AmendmentAgreementSnapshot {
  status: string;
  version: number;
  description: string;
  measurements: string;
  deadline: string;
  tolerances?: string;
  finalPrice: number;
}

export interface AmendmentInput {
  description: unknown;
  measurements: unknown;
  deadline: unknown;
  tolerances?: unknown;
  finalPrice: unknown;
  reason: unknown;
}

export interface AmendmentConfirmations { customer: boolean; master: boolean }

export function decideAmendmentProposal(
  order: AmendmentOrderSnapshot,
  agreement: AmendmentAgreementSnapshot,
  actorId: string,
  input: AmendmentInput,
) {
  const masterId = requireParticipant(order, actorId);
  requireChangeableState(order);
  if (agreement.status !== 'confirmed' || agreement.version < 1) {
    throw new DomainError('INVALID_STATE', 'Изменять можно только подтверждённые условия');
  }
  const description = requiredText(input.description, 'Укажите обновлённое описание', 5_000);
  const measurements = requiredText(input.measurements, 'Укажите обновлённые мерки', 5_000);
  const deadline = dateText(input.deadline);
  const tolerances = optionalText(input.tolerances, 1_000);
  const finalPrice = price(input.finalPrice);
  const reason = requiredText(input.reason, 'Объясните причину изменения', 2_000);
  if (reason.length < 10) throw new DomainError('VALIDATION_ERROR', 'Причина должна содержать не менее 10 символов');
  if (description === agreement.description
    && measurements === agreement.measurements
    && deadline === agreement.deadline
    && tolerances === (agreement.tolerances ?? '')
    && finalPrice === agreement.finalPrice) {
    throw new DomainError('VALIDATION_ERROR', 'Измените хотя бы одно условие');
  }
  return {
    orderId: order.id,
    customerId: order.customerId,
    masterId,
    baseAgreementVersion: agreement.version,
    targetAgreementVersion: agreement.version + 1,
    description,
    measurements,
    deadline,
    ...(tolerances ? { tolerances } : {}),
    finalPrice,
    reason,
  };
}

function price(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 100) {
    throw new DomainError('VALIDATION_ERROR', 'Итоговая цена должна быть целым числом не менее 100 ₽');
  }
  const amountMinor = Number(value) * 100;
  if (!Number.isSafeInteger(amountMinor)) {
    throw new DomainError('VALIDATION_ERROR', 'Итоговая цена слишком велика');
  }
  return Number(value);
}

export function decideAmendmentConfirmation(
  order: AmendmentOrderSnapshot,
  actorId: string,
  confirmations: AmendmentConfirmations,
) {
  requireParticipant(order, actorId);
  requireChangeableState(order);
  const next = {
    customer: confirmations.customer || actorId === order.customerId,
    master: confirmations.master || actorId === order.selectedMasterId,
  };
  return { confirmations: next, fullyConfirmed: next.customer && next.master };
}

function requireChangeableState(order: AmendmentOrderSnapshot) {
  if (order.paymentStatus !== 'funded' || !['paid', 'in_progress'].includes(order.status)) {
    throw new DomainError('INVALID_STATE', 'Изменение условий доступно после оплаты и до готовности изделия');
  }
}

function requireParticipant(order: AmendmentOrderSnapshot, actorId: string) {
  if (!order.selectedMasterId) throw new DomainError('INVALID_STATE', 'В заказе не выбран мастер');
  if (actorId !== order.customerId && actorId !== order.selectedMasterId) {
    throw new DomainError('FORBIDDEN', 'Изменение доступно только участникам заказа');
  }
  return order.selectedMasterId;
}

function dateText(value: unknown) {
  const text = requiredText(value, 'Укажите новый срок', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new DomainError('VALIDATION_ERROR', 'Срок должен быть календарной датой');
  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new DomainError('VALIDATION_ERROR', 'Укажите существующую календарную дату');
  }
  return text;
}

function requiredText(value: unknown, message: string, maxLength: number) {
  const text = optionalText(value, maxLength);
  if (!text) throw new DomainError('VALIDATION_ERROR', message);
  return text;
}

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new DomainError('VALIDATION_ERROR', 'Некорректное текстовое поле');
  const text = value.trim();
  if (text.length > maxLength) throw new DomainError('VALIDATION_ERROR', 'Текстовое поле слишком длинное');
  return text;
}
