import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import {
  decideMasterSelection,
  type SelectableOrderSnapshot,
} from './select-master.ts';

const order: SelectableOrderSnapshot = {
  id: 'order-1',
  customerId: 'customer-1',
  status: 'awaiting_responses',
  proposals: {
    'master-1': {
      masterId: 'master-1',
      masterAlias: 'Мастер №1842',
      price: 9_500,
    },
  },
};

test('customer selects a master using the stored proposal', () => {
  assert.deepEqual(decideMasterSelection(order, 'customer-1', 'master-1'), {
    selectedMasterId: 'master-1',
    selectedMasterAlias: 'Мастер №1842',
    selectedPrice: 9_500,
    nextStatus: 'master_selected',
  });
});

test('another user cannot select a master', () => {
  assert.throws(
    () => decideMasterSelection(order, 'intruder', 'master-1'),
    (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});

test('master cannot be selected after the response stage', () => {
  assert.throws(
    () => decideMasterSelection({ ...order, status: 'in_progress' }, 'customer-1', 'master-1'),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
});

test('selection is rejected when the master did not respond', () => {
  assert.throws(
    () => decideMasterSelection(order, 'customer-1', 'master-2'),
    (error: unknown) => error instanceof DomainError && error.code === 'NOT_FOUND',
  );
});

test('selection is rejected when the stored proposal price is invalid', () => {
  const malformed: SelectableOrderSnapshot = {
    ...order,
    proposals: {
      'master-1': { ...order.proposals['master-1'], price: 0 },
    },
  };

  assert.throws(
    () => decideMasterSelection(malformed, 'customer-1', 'master-1'),
    (error: unknown) => error instanceof DomainError && error.code === 'VALIDATION_ERROR',
  );
});

test('expired proposal requires reconfirmation before selection', () => {
  const expired: SelectableOrderSnapshot = {
    ...order,
    proposals: {
      'master-1': {
        ...order.proposals['master-1'],
        validUntil: new Date('2026-10-25T00:00:00.000Z'),
      },
    },
  };

  assert.throws(
    () => decideMasterSelection(
      expired,
      'customer-1',
      'master-1',
      new Date('2026-10-26T00:00:00.000Z'),
    ),
    (error: unknown) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
});
