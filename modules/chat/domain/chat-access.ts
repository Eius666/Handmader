import { DomainError } from '../../shared/domain/domain-error.ts';

export interface ChatParticipantSnapshot {
  customerId: string;
  masterId: string;
}

export function requireChatParticipant(
  chat: ChatParticipantSnapshot,
  actorId: string,
): 'customer' | 'master' {
  if (actorId === chat.customerId) return 'customer';
  if (actorId === chat.masterId) return 'master';
  throw new DomainError('FORBIDDEN', 'Чат доступен только участникам заказа');
}
