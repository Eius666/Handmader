import assert from 'node:assert/strict';
import test from 'node:test';

import { ACCEPTANCE_WINDOW_DAYS, decideAutomaticAcceptance, decideDeliveryStart, decideOrderAcceptance, decideReceiptConfirmation } from './delivery.ts';

const order = { id: 'o1', customerId: 'c1', selectedMasterId: 'm1', status: 'ready' };

test('master starts tracked delivery using confirmed agreement', () => {
  assert.deepEqual(decideDeliveryStart(order, { status: 'confirmed', deliveryMethod: 'delivery' }, 'm1', {
    carrier: 'Почта России', trackingNumber: '1234567890',
  }), { method: 'delivery', status: 'in_transit', carrier: 'Почта России', trackingNumber: '1234567890' });
});

test('local handoff uses double confirmation without tracking data', () => {
  assert.deepEqual(decideDeliveryStart(order, { status: 'confirmed', deliveryMethod: 'local' }, 'm1', {}), {
    method: 'local', status: 'handoff_pending',
  });
});

test('customer confirmation starts five-day acceptance window', () => {
  const now = Date.UTC(2026, 9, 29);
  const result = decideReceiptConfirmation(
    { ...order, status: 'in_delivery' },
    { method: 'delivery', status: 'in_transit' },
    'c1',
    now,
  );
  assert.equal(result.acceptanceDueAtMs, now + ACCEPTANCE_WINDOW_DAYS * 86_400_000);
});

test('customer can accept a delivered order', () => {
  assert.deepEqual(decideOrderAcceptance(
    { ...order, status: 'delivered' },
    { method: 'local', status: 'delivered' },
    'c1',
  ), { status: 'accepted', automatic: false });
});

test('automatic acceptance waits five days and is blocked by dispute', () => {
  const delivery = { method: 'delivery' as const, status: 'delivered' as const, acceptanceDueAtMs: 100 };
  assert.throws(() => decideAutomaticAcceptance({ ...order, status: 'delivered' }, delivery, 99), /ещё не наступил/);
  assert.throws(() => decideAutomaticAcceptance({ ...order, status: 'delivered', disputeStatus: 'open' }, delivery, 101), /со спором/);
  assert.throws(() => decideAutomaticAcceptance({ ...order, status: 'delivered', disputeStatus: 'resolved_refund' }, delivery, 101), /со спором/);
  assert.deepEqual(decideAutomaticAcceptance({ ...order, status: 'delivered' }, delivery, 101), { status: 'accepted', automatic: true });
});
