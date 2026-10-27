import { DomainError } from '../../shared/domain/domain-error.ts';

export interface AgreementOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  status: string;
  description: string;
  measurements: string;
  photos: string[];
  selectedPrice?: number;
  deliveryOption?: 'local' | 'delivery' | 'both';
}

export interface ProposeAgreementInput {
  finalPrice: unknown;
  deadline: unknown;
  deliveryMethod: unknown;
  deliveryIncluded: unknown;
  tolerances?: unknown;
}

export interface AgreementTerms {
  orderId: string;
  customerId: string;
  masterId: string;
  description: string;
  measurements: string;
  referencePhotos: string[];
  finalPrice: number;
  deadline: string;
  deliveryMethod: 'local' | 'delivery';
  deliveryIncluded: boolean;
  tolerances?: string;
  cancellationPolicyVersion: '2026-10-26';
}

export interface AgreementConfirmations {
  customer: boolean;
  master: boolean;
}

export function decideAgreementProposal(
  order: AgreementOrderSnapshot,
  actorId: string,
  input: ProposeAgreementInput,
): AgreementTerms {
  const masterId = requireParticipant(order, actorId);
  if (order.status !== 'master_selected') {
    throw new DomainError('INVALID_STATE', 'Условия можно согласовать после выбора мастера и до оплаты');
  }
  if (typeof input.finalPrice !== 'number'
    || !Number.isSafeInteger(input.finalPrice)
    || input.finalPrice < 100
    || input.finalPrice > 100_000_000) {
    throw new DomainError('VALIDATION_ERROR', 'Итоговая цена должна быть целым числом от 100 рублей');
  }
  const deadline = dateText(input.deadline);
  const tolerances = optionalText(input.tolerances, 1_000);
  const deliveryMethod = input.deliveryMethod === 'local' || input.deliveryMethod === 'delivery'
    ? input.deliveryMethod
    : null;
  if (!deliveryMethod || !deliveryAllowed(order.deliveryOption, deliveryMethod)) {
    throw new DomainError('VALIDATION_ERROR', 'Выберите разрешённый способ получения');
  }
  if (typeof input.deliveryIncluded !== 'boolean') {
    throw new DomainError('VALIDATION_ERROR', 'Укажите, включена ли доставка в итоговую цену');
  }

  return {
    orderId: order.id,
    customerId: order.customerId,
    masterId,
    description: requiredText(order.description, 'В заказе нет описания', 5_000),
    measurements: requiredText(order.measurements, 'В заказе нет мерок', 5_000),
    referencePhotos: order.photos.slice(0, 5),
    finalPrice: input.finalPrice,
    deadline,
    deliveryMethod,
    deliveryIncluded: input.deliveryIncluded,
    ...(tolerances ? { tolerances } : {}),
    cancellationPolicyVersion: '2026-10-26',
  };
}

export function decideAgreementConfirmation(
  order: AgreementOrderSnapshot,
  actorId: string,
  current: AgreementConfirmations,
): { confirmations: AgreementConfirmations; fullyConfirmed: boolean } {
  requireParticipant(order, actorId);
  if (order.status !== 'master_selected') {
    throw new DomainError('INVALID_STATE', 'Эту версию условий уже нельзя подтвердить');
  }
  const confirmations = {
    customer: current.customer || actorId === order.customerId,
    master: current.master || actorId === order.selectedMasterId,
  };
  return {
    confirmations,
    fullyConfirmed: confirmations.customer && confirmations.master,
  };
}

function requireParticipant(order: AgreementOrderSnapshot, actorId: string): string {
  if (!order.selectedMasterId) {
    throw new DomainError('INVALID_STATE', 'Для заказа не выбран мастер');
  }
  if (actorId !== order.customerId && actorId !== order.selectedMasterId) {
    throw new DomainError('FORBIDDEN', 'Условия доступны только участникам заказа');
  }
  return order.selectedMasterId;
}

function deliveryAllowed(
  allowed: AgreementOrderSnapshot['deliveryOption'],
  selected: 'local' | 'delivery',
): boolean {
  return allowed === 'both' || (allowed ?? 'local') === selected;
}

function dateText(value: unknown): string {
  const text = requiredText(value, 'Укажите согласованный срок', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new DomainError('VALIDATION_ERROR', 'Срок должен быть календарной датой');
  }
  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day) {
    throw new DomainError('VALIDATION_ERROR', 'Укажите существующую календарную дату');
  }
  return text;
}

function requiredText(value: unknown, message: string, maxLength: number): string {
  const text = optionalText(value, maxLength);
  if (!text) throw new DomainError('VALIDATION_ERROR', message);
  return text;
}

function optionalText(value: unknown, maxLength: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new DomainError('VALIDATION_ERROR', 'Некорректное текстовое поле');
  const text = value.trim();
  if (text.length > maxLength) throw new DomainError('VALIDATION_ERROR', 'Текстовое поле слишком длинное');
  return text;
}
