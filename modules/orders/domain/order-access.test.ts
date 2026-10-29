import assert from 'node:assert/strict';
import test from 'node:test';

import { canActorReadOrder, canMasterDiscoverOrder } from './order-access.ts';

const order = {
  customerId: 'customer-1',
  status: 'awaiting_responses',
  category: 'hat',
  location: 'Москва',
  deliveryOption: 'both' as const,
};

test('unverified master sees own categories only in the same city', () => {
  assert.equal(canMasterDiscoverOrder(order, {
    id: 'master-1', role: 'master', categories: ['hat'], city: 'москва', verified: false,
  }), true);
  assert.equal(canMasterDiscoverOrder(order, {
    id: 'master-2', role: 'master', categories: ['hat'], city: 'Казань', verified: false,
  }), false);
});

test('verified master sees a delivery order from another city', () => {
  assert.equal(canMasterDiscoverOrder(order, {
    id: 'master-1', role: 'both', categories: ['hat'], city: 'Казань', verified: true,
  }), true);
});

test('category mismatch and local-only delivery keep order hidden', () => {
  assert.equal(canMasterDiscoverOrder(order, {
    id: 'master-1', role: 'master', categories: ['toy'], city: 'Москва', verified: true,
  }), false);
  assert.equal(canMasterDiscoverOrder({ ...order, deliveryOption: 'local' }, {
    id: 'master-1', role: 'master', categories: ['hat'], city: 'Казань', verified: true,
  }), false);
});

test('previous selected master does not rediscover a reopened order', () => {
  assert.equal(canMasterDiscoverOrder({ ...order, excludedMasterIds: ['master-1'] }, {
    id: 'master-1', role: 'master', categories: ['hat'], city: 'Москва', verified: true,
  }), false);
});

test('owner, selected master and responding master retain access', () => {
  const blankActor = { role: null, categories: [], verified: false };
  assert.equal(canActorReadOrder(order, { ...blankActor, id: 'customer-1' }), true);
  assert.equal(canActorReadOrder(
    { ...order, status: 'in_progress', selectedMasterId: 'master-1' },
    { ...blankActor, id: 'master-1' },
  ), true);
  assert.equal(canActorReadOrder(order, { ...blankActor, id: 'master-2' }, true), true);
});
