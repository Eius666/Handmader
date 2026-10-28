import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { decideVerification } from './verification-decision.ts';

test('admin can approve a pending verification application', () => {
  assert.deepEqual(
    decideVerification({ userId: 'master-1', status: 'pending' }, 'admin', 'approve', ''),
    { status: 'verified', verified: true },
  );
});

test('rejection requires a meaningful reason', () => {
  assert.throws(
    () => decideVerification({ userId: 'master-1', status: 'pending' }, 'admin', 'reject', 'нет'),
    DomainError,
  );
  assert.deepEqual(
    decideVerification(
      { userId: 'master-1', status: 'pending' },
      'admin',
      'reject',
      'Не приложены документы',
    ),
    { status: 'rejected', verified: false, reason: 'Не приложены документы' },
  );
});

test('support cannot make a verification decision and completed requests are immutable', () => {
  assert.throws(
    () => decideVerification({ userId: 'master-1', status: 'pending' }, 'support', 'approve', ''),
    DomainError,
  );
  assert.throws(
    () => decideVerification({ userId: 'master-1', status: 'verified' }, 'admin', 'approve', ''),
    DomainError,
  );
});
