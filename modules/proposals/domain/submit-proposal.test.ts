import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { decideProposalSubmission } from './submit-proposal.ts';

const order = {
  id: 'order-1',
  customerId: 'customer-1',
  status: 'awaiting_responses',
};
const master = { id: 'master-1', role: 'master' };
const now = new Date('2026-10-26T12:00:00.000Z');

test('master creates a normalized proposal valid for three days', () => {
  const decision = decideProposalSubmission(order, master, {
    price: 12_500,
    timeline: ' 14 дней ',
    comment: ' Могу выполнить заказ ',
  }, 0, now);

  assert.equal(decision.version, 1);
  assert.equal(decision.timeline, '14 дней');
  assert.equal(decision.comment, 'Могу выполнить заказ');
  assert.equal(decision.validUntil.toISOString(), '2026-10-29T12:00:00.000Z');
});

test('new submission creates a new immutable version', () => {
  const decision = decideProposalSubmission(order, master, {
    price: 13_000,
    timeline: '15 дней',
    comment: '',
  }, 2, now);

  assert.equal(decision.version, 3);
});

test('customer cannot respond to an order', () => {
  assert.throws(
    () => decideProposalSubmission(order, { id: 'customer-2', role: 'customer' }, {
      price: 1_000,
      timeline: '7 дней',
      comment: '',
    }, 0, now),
    (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});

test('master cannot respond to own order', () => {
  assert.throws(
    () => decideProposalSubmission(order, { id: 'customer-1', role: 'both' }, {
      price: 1_000,
      timeline: '7 дней',
      comment: '',
    }, 0, now),
    (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});

test('proposal is rejected after response collection', () => {
  assert.throws(
    () => decideProposalSubmission({ ...order, status: 'master_selected' }, master, {
      price: 1_000,
      timeline: '7 дней',
      comment: '',
    }, 0, now),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
});
