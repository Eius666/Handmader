import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { getOrderCounterpart } from './order-counterpart.ts';

const order = {
  customerId: 'customer-1',
  customerName: 'Заказчик №7008',
  selectedMasterId: 'master-1',
  selectedMasterName: 'Мастер №7756',
};

test('customer sees the selected master as the counterpart', () => {
  assert.deepEqual(getOrderCounterpart(order, 'customer-1'), {
    role: 'master',
    name: 'Мастер №7756',
  });
});

test('master sees the customer as the counterpart', () => {
  assert.deepEqual(getOrderCounterpart(order, 'master-1'), {
    role: 'customer',
    name: 'Заказчик №7008',
  });
});

test('unrelated user cannot resolve an order counterpart', () => {
  assert.throws(
    () => getOrderCounterpart(order, 'intruder'),
    (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});
