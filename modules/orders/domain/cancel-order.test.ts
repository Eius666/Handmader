import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { decideOrderCancellation } from './cancel-order.ts';

const order = {
  id: 'order-1',
  customerId: 'customer-1',
  status: 'awaiting_responses',
};

test('customer can cancel an order while proposals are collected', () => {
  assert.deepEqual(decideOrderCancellation(order, 'customer-1'), {
    previousStatus: 'awaiting_responses',
    nextStatus: 'cancelled',
  });
});

test('another user cannot cancel the order', () => {
  assert.throws(
    () => decideOrderCancellation(order, 'intruder'),
    (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});

test('selected master requires the supported cancellation process', () => {
  assert.throws(
    () => decideOrderCancellation({ ...order, status: 'master_selected' }, 'customer-1'),
    (error: unknown) => error instanceof DomainError
      && error.code === 'INVALID_STATE'
      && error.message.includes('поддержку'),
  );
});
