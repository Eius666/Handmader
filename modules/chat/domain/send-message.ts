import { DomainError } from '../../shared/domain/domain-error.ts';

export interface ChatOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  paymentConfirmed: boolean;
}

export interface SendMessageDecision {
  text: string;
  senderRole: 'customer' | 'master';
  recipientId: string;
}

export function decideMessageSending(
  order: ChatOrderSnapshot,
  actorId: string,
  rawText: string,
): SendMessageDecision {
  if (!order.selectedMasterId) {
    throw new DomainError('INVALID_STATE', 'Чат откроется после выбора мастера');
  }

  const senderRole = actorId === order.customerId
    ? 'customer'
    : actorId === order.selectedMasterId
      ? 'master'
      : null;
  if (!senderRole) {
    throw new DomainError('FORBIDDEN', 'Доступ к чату есть только у участников заказа');
  }

  const text = rawText.trim();
  if (!text || text.length > 4_000) {
    throw new DomainError('VALIDATION_ERROR', 'Сообщение должно содержать от 1 до 4000 символов');
  }
  if (!order.paymentConfirmed && containsContactDetails(text)) {
    throw new DomainError(
      'VALIDATION_ERROR',
      'Обмен контактами станет доступен после оплаты заказа',
    );
  }

  return {
    text,
    senderRole,
    recipientId: senderRole === 'customer' ? order.selectedMasterId : order.customerId,
  };
}

export function containsContactDetails(text: string): boolean {
  const normalized = text.toLowerCase();
  const patterns = [
    /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/iu,
    /(?:https?:\/\/|www\.)\S+/iu,
    /(?:^|\s)@[a-z][a-z0-9_.]{3,}/iu,
    /(?:\+?7|8)[\s().-]*(?:\d[\s().-]*){10}/u,
    /\b(?:telegram|телеграм|whatsapp|ватсап|viber|вайбер)\b/iu,
  ];
  return patterns.some((pattern) => pattern.test(normalized));
}
