import assert from 'node:assert/strict';
import test from 'node:test';
import { decideTestSettlement } from './settlement.ts';

const order = { id: 'o1', customerId: 'c1', selectedMasterId: 'm1', status: 'accepted', settlementStatus: 'payout_pending' };
const payment = { status: 'funded', testMode: true, currency: 'RUB', grossAmountMinor: 1_000_000, masterAmountMinor: 900_000, commissionAmountMinor: 100_000 };

test('accepted order settles to master payout and completed status', () => {
  assert.deepEqual(decideTestSettlement(order, payment, null), {
    orderId: 'o1', customerId: 'c1', masterId: 'm1', currency: 'RUB', grossAmountMinor: 1_000_000,
    customerRefundAmountMinor: 0, masterPayoutAmountMinor: 900_000, platformFeeAmountMinor: 100_000, outcome: 'completed',
  });
});

test('resolved dispute uses the explicit administration calculation', () => {
  const decision = decideTestSettlement({ ...order, status: 'delivered', disputeStatus: 'resolved_refund', settlementStatus: 'refund_pending' }, payment, {
    status: 'resolved', resolution: 'partial_refund', customerRefundAmountMinor: 400_000, masterPayoutAmountMinor: 500_000, platformFeeAmountMinor: 100_000,
  });
  assert.equal(decision.outcome, 'partially_refunded');
  assert.equal(decision.customerRefundAmountMinor, 400_000);
});

test('full refund closes without payout or platform fee', () => {
  const decision = decideTestSettlement({ ...order, disputeStatus: 'resolved_refund', settlementStatus: 'refund_pending' }, payment, {
    status: 'resolved', resolution: 'full_refund', customerRefundAmountMinor: 1_000_000, masterPayoutAmountMinor: 0, platformFeeAmountMinor: 0,
  });
  assert.equal(decision.outcome, 'refunded');
});

test('open dispute and repeated settlement are rejected', () => {
  assert.throws(() => decideTestSettlement({ ...order, disputeStatus: 'open' }, payment, null), /разрешить/);
  assert.throws(() => decideTestSettlement({ ...order, settlementStatus: 'completed' }, payment, null), /уже выполнен/);
});
