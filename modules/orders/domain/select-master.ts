import { DomainError } from '../../shared/domain/domain-error.ts';

export interface ProposalSnapshot {
  masterId: string;
  masterAlias: string;
  price: number;
  validUntil?: Date;
  status?: string;
  confirmedReselectionCycle?: number;
}

export interface SelectableOrderSnapshot {
  id: string;
  customerId: string;
  status: string;
  proposals: Readonly<Record<string, ProposalSnapshot>>;
  selectedMasterId?: string;
  reselectionCycle?: number;
  excludedMasterIds?: readonly string[];
}

export interface SelectMasterDecision {
  selectedMasterId: string;
  selectedMasterAlias: string;
  selectedPrice: number;
  nextStatus: 'master_selected';
}

/**
 * Pure domain rule for choosing an order executor.
 *
 * It deliberately knows nothing about Firestore, HTTP, Firebase Auth or Next.js.
 * Infrastructure adapters are responsible for calling it inside an atomic
 * transaction and persisting the returned decision.
 */
export function decideMasterSelection(
  order: SelectableOrderSnapshot,
  actorId: string,
  masterId: string,
  now = new Date(),
): SelectMasterDecision {
  if (order.customerId !== actorId) {
    throw new DomainError('FORBIDDEN', 'Только заказчик может выбрать мастера');
  }

  if (order.status !== 'awaiting_responses') {
    throw new DomainError('INVALID_STATE', 'На текущем этапе выбрать мастера нельзя');
  }

  if (order.selectedMasterId) {
    throw new DomainError('INVALID_STATE', 'Мастер уже выбран');
  }

  const proposal = order.proposals[masterId];
  if (!proposal || proposal.masterId !== masterId) {
    throw new DomainError('NOT_FOUND', 'Отклик этого мастера не найден');
  }

  if (order.excludedMasterIds?.includes(masterId)) {
    throw new DomainError('FORBIDDEN', 'Предыдущий исполнитель исключён из повторного выбора');
  }

  const reselectionCycle = order.reselectionCycle ?? 0;
  if (proposal.status === 'excluded'
    || proposal.status === 'reconfirmation_required'
    || (proposal.confirmedReselectionCycle ?? 0) < reselectionCycle) {
    throw new DomainError('INVALID_STATE', 'Мастер должен подтвердить актуальность отклика');
  }

  if (!Number.isFinite(proposal.price) || proposal.price <= 0) {
    throw new DomainError('VALIDATION_ERROR', 'В отклике указана некорректная цена');
  }
  if (proposal.validUntil && proposal.validUntil.getTime() <= now.getTime()) {
    throw new DomainError('INVALID_STATE', 'Мастер должен подтвердить актуальность отклика');
  }

  return {
    selectedMasterId: proposal.masterId,
    selectedMasterAlias: proposal.masterAlias,
    selectedPrice: proposal.price,
    nextStatus: 'master_selected',
  };
}
