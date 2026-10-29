import { DomainError } from '../../shared/domain/domain-error.ts';

export interface ReconfirmationOrderSnapshot {
  status: string;
  reselectionCycle: number;
  reconfirmationDeadline?: Date;
  excludedMasterIds: readonly string[];
}

export interface ReconfirmationProposalSnapshot {
  masterId: string;
  confirmedReselectionCycle: number;
}

export interface ReconfirmationDecision {
  confirmedReselectionCycle: number;
  status: 'active';
  validUntil: Date;
}

const PROPOSAL_VALIDITY_MS = 3 * 24 * 60 * 60 * 1_000;

export function decideProposalReconfirmation(
  order: ReconfirmationOrderSnapshot,
  proposal: ReconfirmationProposalSnapshot,
  actorId: string,
  now: Date,
): ReconfirmationDecision {
  if (proposal.masterId !== actorId) {
    throw new DomainError('FORBIDDEN', 'Подтвердить можно только собственный отклик');
  }
  if (order.status !== 'awaiting_responses' || order.reselectionCycle <= 0) {
    throw new DomainError('INVALID_STATE', 'Подтверждение актуальности сейчас не требуется');
  }
  if (order.excludedMasterIds.includes(actorId)) {
    throw new DomainError('FORBIDDEN', 'Предыдущий исполнитель исключён из повторного выбора');
  }
  if (proposal.confirmedReselectionCycle >= order.reselectionCycle) {
    throw new DomainError('INVALID_STATE', 'Отклик уже подтверждён');
  }
  if (!order.reconfirmationDeadline
    || order.reconfirmationDeadline.getTime() <= now.getTime()) {
    throw new DomainError('INVALID_STATE', 'Срок подтверждения отклика истёк');
  }
  return {
    confirmedReselectionCycle: order.reselectionCycle,
    status: 'active',
    validUntil: new Date(now.getTime() + PROPOSAL_VALIDITY_MS),
  };
}
