import { DomainError } from '../../shared/domain/domain-error.ts';

export interface ProposalOrderSnapshot {
  id: string;
  customerId: string;
  status: string;
  excludedMasterIds?: readonly string[];
}

export interface ProposalActorSnapshot {
  id: string;
  role: string | null;
}

export interface ProposalDraft {
  price: number;
  timeline: string;
  comment: string;
}

export interface ProposalDecision {
  version: number;
  price: number;
  timeline: string;
  comment: string;
  status: 'active';
  validUntil: Date;
}

const PROPOSAL_VALIDITY_MS = 3 * 24 * 60 * 60 * 1_000;

export function decideProposalSubmission(
  order: ProposalOrderSnapshot,
  actor: ProposalActorSnapshot,
  draft: ProposalDraft,
  previousVersion: number,
  now: Date,
): ProposalDecision {
  if (actor.role !== 'master' && actor.role !== 'both') {
    throw new DomainError('FORBIDDEN', 'Только мастер может отправить отклик');
  }
  if (order.customerId === actor.id) {
    throw new DomainError('FORBIDDEN', 'Нельзя откликнуться на собственный заказ');
  }
  if (order.excludedMasterIds?.includes(actor.id)) {
    throw new DomainError('FORBIDDEN', 'Предыдущий исполнитель исключён из повторного выбора');
  }
  if (order.status !== 'awaiting_responses') {
    throw new DomainError('INVALID_STATE', 'Приём откликов на этот заказ завершён');
  }
  if (!Number.isSafeInteger(draft.price) || draft.price <= 0 || draft.price > 100_000_000) {
    throw new DomainError('VALIDATION_ERROR', 'Укажите корректную цену в рублях');
  }

  const timeline = draft.timeline.trim();
  const comment = draft.comment.trim();
  if (timeline.length < 2 || timeline.length > 120) {
    throw new DomainError('VALIDATION_ERROR', 'Срок должен содержать от 2 до 120 символов');
  }
  if (comment.length > 1_000) {
    throw new DomainError('VALIDATION_ERROR', 'Комментарий не должен превышать 1000 символов');
  }

  return {
    version: previousVersion + 1,
    price: draft.price,
    timeline,
    comment,
    status: 'active',
    validUntil: new Date(now.getTime() + PROPOSAL_VALIDITY_MS),
  };
}
