import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { decideOrderCreation } from './create-order.ts';

const input = {
  title: 'Тёплый свитер',
  description: 'Свитер по индивидуальным меркам',
  category: 'sweater',
  photos: [],
  budgetMin: 5_000,
  budgetMax: 10_000,
  deadline: '2026-12-20',
  measurements: 'Рост 168 см',
  location: 'Москва',
  deliveryOption: 'both',
};

test('customer creates a normalized order draft', () => {
  assert.deepEqual(decideOrderCreation({ id: 'customer-1', role: 'customer' }, input), input);
});

test('master-only account cannot publish an order', () => {
  assert.throws(
    () => decideOrderCreation({ id: 'master-1', role: 'master' }, input),
    DomainError,
  );
});

test('budget maximum cannot be below minimum', () => {
  assert.throws(
    () => decideOrderCreation(
      { id: 'customer-1', role: 'customer' },
      { ...input, budgetMax: 1_000 },
    ),
    DomainError,
  );
});
