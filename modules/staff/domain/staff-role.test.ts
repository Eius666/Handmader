import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { parseStaffRole, requireStaffPermission } from './staff-role.ts';

test('staff roles are separate from marketplace roles', () => {
  assert.equal(parseStaffRole('support'), 'support');
  assert.equal(parseStaffRole('admin'), 'admin');
  assert.throws(() => parseStaffRole('master'), DomainError);
});

test('only explicitly allowed staff role can perform an action', () => {
  assert.doesNotThrow(() => requireStaffPermission('admin', ['admin']));
  assert.throws(() => requireStaffPermission('support', ['admin']), DomainError);
});
