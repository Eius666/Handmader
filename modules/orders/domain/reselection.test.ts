import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import {
  decideReselectionRequest,
  decideSelectionReopen,
  type ReselectionCaseSnapshot,
  type ReselectionOrderSnapshot,
} from './reselection.ts';

const order: ReselectionOrderSnapshot = {
  id: 'order-1',
  customerId: 'customer-1',
  status: 'master_selected',
  selectedMasterId: 'master-1',
  paymentConfirmed: false,
  reselectionCycle: 0,
};

const supportCase: ReselectionCaseSnapshot = {
  id: 'case-1',
  orderId: 'order-1',
  customerId: 'customer-1',
  previousMasterId: 'master-1',
  status: 'pending',
  reason: 'Не удалось согласовать итоговые условия',
};

test('customer can request reselection before payment', () => {
  assert.deepEqual(
    decideReselectionRequest(order, 'customer-1', ' Не удалось согласовать итоговые условия '),
    {
      reason: 'Не удалось согласовать итоговые условия',
      previousMasterId: 'master-1',
    },
  );
});

test('reselection request is rejected after payment', () => {
  assert.throws(
    () => decideReselectionRequest({ ...order, paymentConfirmed: true }, 'customer-1', 'Достаточная причина запроса'),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
});

test('duplicate pending request is rejected', () => {
  assert.throws(
    () => decideReselectionRequest(
      { ...order, reselectionRequestStatus: 'pending' },
      'customer-1',
      'Достаточная причина запроса',
    ),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
});

test('support reopening advances cycle and returns order to proposals', () => {
  assert.deepEqual(decideSelectionReopen({
    ...order,
    reselectionRequestStatus: 'pending',
    reselectionCycle: 2,
  }, supportCase), {
    previousMasterId: 'master-1',
    nextStatus: 'awaiting_responses',
    nextCycle: 3,
  });
});

test('support cannot reopen a stale case for another selected master', () => {
  assert.throws(
    () => decideSelectionReopen({
      ...order,
      selectedMasterId: 'master-2',
      reselectionRequestStatus: 'pending',
    }, supportCase),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
});
