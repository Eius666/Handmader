import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { decideReviewSubmission, REVIEW_PUBLICATION_DELAY_MS } from './submit-review.ts';

const completedAt = new Date('2026-10-20T09:00:00.000Z');
const order = {
  id: 'order-1',
  customerId: 'customer-1',
  selectedMasterId: 'master-1',
  status: 'completed',
  completedAt,
};

test('customer review targets the selected master and is delayed for seven days', () => {
  const review = decideReviewSubmission(order, 'customer-1', {
    rating: 5,
    comment: '  Отличная работа  ',
  });

  assert.equal(review.subjectId, 'master-1');
  assert.equal(review.authorRole, 'customer');
  assert.equal(review.subjectRole, 'master');
  assert.equal(review.comment, 'Отличная работа');
  assert.equal(review.publishAt.getTime(), completedAt.getTime() + REVIEW_PUBLICATION_DELAY_MS);
});

test('master can review the customer', () => {
  const review = decideReviewSubmission(order, 'master-1', { rating: 4 });
  assert.equal(review.subjectId, 'customer-1');
  assert.equal(review.authorRole, 'master');
  assert.equal(review.subjectRole, 'customer');
  assert.equal(review.comment, undefined);
});

test('unrelated user cannot submit a review', () => {
  assert.throws(
    () => decideReviewSubmission(order, 'intruder', { rating: 5 }),
    (error) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});

test('review is rejected before completion', () => {
  assert.throws(
    () => decideReviewSubmission({ ...order, status: 'ready' }, 'customer-1', { rating: 5 }),
    (error) => error instanceof DomainError && error.code === 'INVALID_STATE',
  );
});

test('rating must be an integer from one to five', () => {
  for (const rating of [0, 6, 4.5, '5']) {
    assert.throws(
      () => decideReviewSubmission(order, 'customer-1', { rating }),
      (error) => error instanceof DomainError && error.code === 'VALIDATION_ERROR',
    );
  }
});

test('comment is normalized and limited', () => {
  assert.throws(
    () => decideReviewSubmission(order, 'customer-1', { rating: 5, comment: 'x'.repeat(1001) }),
    (error) => error instanceof DomainError && error.code === 'VALIDATION_ERROR',
  );
});
