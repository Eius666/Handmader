import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { parseMasterProfile, parseUserRole, parseVerificationApplication } from './profile.ts';

test('role parser accepts only supported roles', () => {
  assert.equal(parseUserRole('both'), 'both');
  assert.throws(() => parseUserRole('admin'), DomainError);
});

test('master profile ignores client-owned rating and portfolio fields', () => {
  assert.deepEqual(parseMasterProfile({
    bio: '  Вяжу на заказ  ',
    location: ' Москва ',
    categories: ['hat', 'hat', 'unknown'],
    rating: 5,
    completedOrders: 999,
    portfolioPhotos: ['https://example.test/photo.jpg'],
  }), {
    bio: 'Вяжу на заказ',
    location: 'Москва',
    categories: ['hat'],
  });
});

test('verification application requires a meaningful experience description', () => {
  assert.throws(
    () => parseVerificationApplication({ experience: 'мало' }),
    DomainError,
  );
});
