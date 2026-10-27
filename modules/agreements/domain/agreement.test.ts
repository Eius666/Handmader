import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { decideAgreementConfirmation, decideAgreementProposal } from './agreement.ts';

const order = {
  id: 'order-1',
  customerId: 'customer-1',
  selectedMasterId: 'master-1',
  status: 'master_selected',
  description: 'Свитер оверсайз',
  measurements: 'Рост 168 см',
  photos: ['https://example.test/reference.jpg'],
  selectedPrice: 8_000,
  deliveryOption: 'both' as const,
};

test('participant proposes a versioned snapshot of final terms', () => {
  const terms = decideAgreementProposal(order, 'master-1', {
    finalPrice: 8_500,
    deadline: '2026-12-20',
    deliveryMethod: 'delivery',
    deliveryIncluded: true,
    tolerances: '2 см',
  });
  assert.equal(terms.finalPrice, 8_500);
  assert.equal(terms.masterId, 'master-1');
  assert.equal(terms.measurements, order.measurements);
  assert.equal(terms.cancellationPolicyVersion, '2026-10-26');
});

test('proposal cannot select a delivery method excluded by the order', () => {
  assert.throws(
    () => decideAgreementProposal({ ...order, deliveryOption: 'local' }, 'customer-1', {
      finalPrice: 8_500,
      deadline: '2026-12-20',
      deliveryMethod: 'delivery',
      deliveryIncluded: false,
    }),
    (error) => error instanceof DomainError && error.code === 'VALIDATION_ERROR',
  );
});

test('legacy order without delivery option defaults to local handoff', () => {
  const terms = decideAgreementProposal({ ...order, deliveryOption: undefined }, 'customer-1', {
    finalPrice: 4_500,
    deadline: '2026-12-20',
    deliveryMethod: 'local',
    deliveryIncluded: false,
  });
  assert.equal(terms.deliveryMethod, 'local');
});

test('agreement rejects a non-existent calendar date', () => {
  assert.throws(
    () => decideAgreementProposal(order, 'customer-1', {
      finalPrice: 4_500,
      deadline: '2026-02-31',
      deliveryMethod: 'local',
      deliveryIncluded: false,
    }),
    (error) => error instanceof DomainError && error.code === 'VALIDATION_ERROR',
  );
});

test('both participants must independently confirm the same terms', () => {
  const first = decideAgreementConfirmation(order, 'customer-1', { customer: false, master: false });
  assert.deepEqual(first, {
    confirmations: { customer: true, master: false },
    fullyConfirmed: false,
  });
  const second = decideAgreementConfirmation(order, 'master-1', first.confirmations);
  assert.equal(second.fullyConfirmed, true);
});

test('unrelated user cannot propose or confirm terms', () => {
  assert.throws(
    () => decideAgreementConfirmation(order, 'intruder', { customer: false, master: false }),
    (error) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});
