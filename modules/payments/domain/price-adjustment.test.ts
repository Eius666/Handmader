import assert from 'node:assert/strict';
import test from 'node:test';
import { decideTestPriceAdjustment } from './price-adjustment.ts';

const order = { id: 'o1', customerId: 'c1', selectedMasterId: 'm1', status: 'in_progress', paymentStatus: 'funded' };
const payment = { status: 'funded', testMode: true, currency: 'RUB', grossAmountMinor: 900_000 };
const amendment = { status: 'financial_pending', finalPrice: 10_000, confirmations: { customer: true, master: true } };

test('higher agreed price creates a test top-up and recalculates commission', () => {
  const result = decideTestPriceAdjustment(order, payment, amendment, 'c1');
  assert.equal(result.type, 'top_up');
  assert.equal(result.amountMinor, 100_000);
  assert.equal(result.commissionAmountMinor, 100_000);
  assert.equal(result.masterAmountMinor, 900_000);
});

test('lower agreed price creates a test refund', () => {
  const result = decideTestPriceAdjustment(order, payment, { ...amendment, finalPrice: 8_000 }, 'c1');
  assert.equal(result.type, 'refund');
  assert.equal(result.amountMinor, 100_000);
  assert.equal(result.targetGrossAmountMinor, 800_000);
});

test('both confirmations and the customer are required', () => {
  assert.throws(() => decideTestPriceAdjustment(order, payment, { ...amendment, confirmations: { customer: true, master: false } }, 'c1'), /обе стороны/);
  assert.throws(() => decideTestPriceAdjustment(order, payment, amendment, 'm1'), /заказчик/);
});

test('price cannot reduce the master share below an authorized material advance', () => {
  assert.throws(() => decideTestPriceAdjustment(order, payment, { ...amendment, finalPrice: 5_000 }, 'c1', 500_000), /аванса/);
});
