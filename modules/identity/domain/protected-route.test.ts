import assert from 'node:assert/strict';
import test from 'node:test';

import { isProtectedRoute } from './protected-route.ts';

test('entry and authentication screens remain public', () => {
  assert.equal(isProtectedRoute('/'), false);
  assert.equal(isProtectedRoute('/auth/login'), false);
  assert.equal(isProtectedRoute('/auth/register/'), false);
});

test('marketplace screens require an authenticated account', () => {
  assert.equal(isProtectedRoute('/notifications'), true);
  assert.equal(isProtectedRoute('/orders/order-1/agreement'), true);
});
