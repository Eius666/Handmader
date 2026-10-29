import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decideMaterialAdvanceAuthorization,
  decideMaterialAdvanceRequest,
  decideMaterialExpenseEvidence,
} from './material-advance.ts';

const order = {
  id: 'order-1',
  customerId: 'customer-1',
  selectedMasterId: 'master-1',
  status: 'paid',
  paymentStatus: 'funded',
  finalPrice: 10_000,
};

test('selected master requests no more than half of final price', () => {
  assert.deepEqual(decideMaterialAdvanceRequest(order, 'master-1', 500_000), {
    requestedAmountMinor: 500_000,
    maximumAmountMinor: 500_000,
  });
  assert.throws(
    () => decideMaterialAdvanceRequest(order, 'master-1', 500_001),
    /50%/,
  );
});

test('material advance is unavailable before funded payment', () => {
  assert.throws(
    () => decideMaterialAdvanceRequest({ ...order, paymentStatus: undefined }, 'master-1', 100_000),
    /после подтверждённой тестовой оплаты/,
  );
});

test('only customer authorizes a pending material advance', () => {
  const advance = { status: 'requested' as const, requestedAmountMinor: 200_000 };
  assert.deepEqual(decideMaterialAdvanceAuthorization(order, advance, 'customer-1'), {
    status: 'authorized',
  });
  assert.throws(
    () => decideMaterialAdvanceAuthorization(order, advance, 'master-1'),
    /только заказчик/,
  );
});

test('expense evidence preserves unused balance', () => {
  const result = decideMaterialExpenseEvidence(
    order,
    { status: 'authorized', requestedAmountMinor: 200_000 },
    'master-1',
    { spentAmountMinor: 175_000, note: 'Чек магазина пряжи №42 от 29.10.2026' },
  );
  assert.equal(result.spentAmountMinor, 175_000);
  assert.equal(result.unusedAmountMinor, 25_000);
  assert.equal(result.status, 'evidence_submitted');
});

test('reported expenses cannot exceed authorized advance', () => {
  assert.throws(
    () => decideMaterialExpenseEvidence(
      order,
      { status: 'authorized', requestedAmountMinor: 200_000 },
      'master-1',
      { spentAmountMinor: 200_001, note: 'Чек магазина пряжи №42 от 29.10.2026' },
    ),
    /в пределах подтверждённого аванса/,
  );
});
