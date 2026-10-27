import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { decideMockPayment } from './mock-payment.ts';

const order = {
  id: 'order-1',
  customerId: 'customer-1',
  selectedMasterId: 'master-1',
  status: 'awaiting_payment',
  agreementStatus: 'confirmed',
  finalPrice: 10_000,
};

test('mock payment calculates the closed beta commission in minor units', () => {
  assert.deepEqual(decideMockPayment(order, 'customer-1'), {
    orderId: 'order-1',
    customerId: 'customer-1',
    masterId: 'master-1',
    currency: 'RUB',
    grossAmountMinor: 1_000_000,
    commissionBps: 1_000,
    commissionAmountMinor: 100_000,
    masterAmountMinor: 900_000,
  });
});

test('master cannot simulate the customer payment', () => {
  assert.throws(
    () => decideMockPayment(order, 'master-1'),
    (error) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});

test('payment requires a confirmed agreement and awaiting payment state', () => {
  assert.throws(
    () => decideMockPayment({ ...order, agreementStatus: 'pending' }, 'customer-1'),
    (error) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
});
