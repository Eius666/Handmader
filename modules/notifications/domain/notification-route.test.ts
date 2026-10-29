import assert from 'node:assert/strict';
import test from 'node:test';

import { notificationRoute } from './notification-route.ts';

test('chat notification opens the chat even when an order id is also present', () => {
  assert.equal(notificationRoute({
    type: 'new_message',
    orderId: 'order 1',
    chatId: 'chat/1',
  }), '/chat/chat%2F1');
});

test('marketplace and agreement notifications open their task-specific screens', () => {
  assert.equal(
    notificationRoute({ type: 'new_response', orderId: 'order-1' }),
    '/orders/order-1',
  );
  assert.equal(
    notificationRoute({ type: 'agreement_pending', orderId: 'order-1' }),
    '/orders/order-1/agreement',
  );
  assert.equal(
    notificationRoute({ type: 'payment_confirmed', orderId: 'order-1' }),
    '/track/order-1',
  );
  assert.equal(
    notificationRoute({ type: 'proposal_reconfirmation_required', orderId: 'order-1' }),
    '/orders/order-1',
  );
  assert.equal(
    notificationRoute({ type: 'material_advance_requested', orderId: 'order-1' }),
    '/orders/order-1/materials',
  );
});

test('verification notification opens profile and missing metadata does not invent a route', () => {
  assert.equal(notificationRoute({ type: 'verification_approved' }), '/profile');
  assert.equal(notificationRoute({ type: 'new_order' }), null);
});
