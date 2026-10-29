import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { decideProposalReconfirmation } from './reconfirm-proposal.ts';

const now = new Date('2026-10-29T10:00:00.000Z');
const order = {
  status: 'awaiting_responses',
  reselectionCycle: 2,
  reconfirmationDeadline: new Date('2026-10-31T10:00:00.000Z'),
  excludedMasterIds: [] as string[],
};
const proposal = { masterId: 'master-2', confirmedReselectionCycle: 1 };

test('master reconfirms an old proposal within 48-hour window', () => {
  assert.deepEqual(decideProposalReconfirmation(order, proposal, 'master-2', now), {
    confirmedReselectionCycle: 2,
    status: 'active',
    validUntil: new Date('2026-11-01T10:00:00.000Z'),
  });
});

test('previous selected master cannot reconfirm', () => {
  assert.throws(
    () => decideProposalReconfirmation(
      { ...order, excludedMasterIds: ['master-2'] },
      proposal,
      'master-2',
      now,
    ),
    (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});

test('expired reconfirmation window is rejected', () => {
  assert.throws(
    () => decideProposalReconfirmation(
      { ...order, reconfirmationDeadline: now },
      proposal,
      'master-2',
      now,
    ),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
});
