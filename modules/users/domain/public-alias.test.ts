import assert from 'node:assert/strict';
import test from 'node:test';

import { createPublicAlias } from './public-alias.ts';

test('public alias is stable and does not contain a user identifier', () => {
  const alias = createPublicAlias('master', 'private-user-id@example.com');

  assert.equal(alias, createPublicAlias('master', 'private-user-id@example.com'));
  assert.match(alias, /^Мастер №\d{4}$/);
  assert.doesNotMatch(alias, /private|example/);
});

test('customer and master aliases have distinct role labels', () => {
  assert.match(createPublicAlias('customer', 'same-id'), /^Заказчик №/);
  assert.match(createPublicAlias('master', 'same-id'), /^Мастер №/);
});
