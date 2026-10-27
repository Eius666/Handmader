import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { decideOrderTransition, type TransitionableOrderSnapshot } from './transition-order.ts';

const base: TransitionableOrderSnapshot = {
  id: 'order-1',
  customerId: 'customer-1',
  selectedMasterId: 'master-1',
  status: 'master_selected',
};

test('selected master can start and finish production', () => {
  const started = decideOrderTransition(base, 'master-1', 'start_work');
  assert.equal(started.nextStatus, 'in_progress');
  assert.equal(started.notifyUserId, 'customer-1');

  const ready = decideOrderTransition(
    { ...base, status: started.nextStatus },
    'master-1',
    'mark_ready',
  );
  assert.equal(ready.nextStatus, 'ready');
});

test('customer can complete a ready order', () => {
  const completed = decideOrderTransition(
    { ...base, status: 'ready' },
    'customer-1',
    'confirm_delivery',
  );
  assert.equal(completed.nextStatus, 'completed');
  assert.equal(completed.notifyUserId, 'master-1');
});

test('unrelated user cannot advance an order', () => {
  assert.throws(
    () => decideOrderTransition(base, 'intruder', 'start_work'),
    (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});

test('transition cannot skip order states', () => {
  assert.throws(
    () => decideOrderTransition(base, 'master-1', 'mark_ready'),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
});

test('new flow requires funded payment before production starts', () => {
  assert.throws(
    () => decideOrderTransition({ ...base, flowVersion: 2 }, 'master-1', 'start_work'),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
  const started = decideOrderTransition(
    { ...base, flowVersion: 2, status: 'paid' },
    'master-1',
    'start_work',
  );
  assert.equal(started.nextStatus, 'in_progress');
});
