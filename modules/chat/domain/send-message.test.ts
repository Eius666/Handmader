import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { containsContactDetails, decideMessageSending } from './send-message.ts';

const order = {
  id: 'order-1',
  customerId: 'customer-1',
  selectedMasterId: 'master-1',
  paymentConfirmed: false,
};

test('order participants can send an ordinary message', () => {
  assert.deepEqual(decideMessageSending(order, 'master-1', '  Уточните обхват талии 92 см  '), {
    text: 'Уточните обхват талии 92 см',
    senderRole: 'master',
    recipientId: 'customer-1',
  });
});

test('measurements are not mistaken for a phone number', () => {
  assert.equal(containsContactDetails('Рост 168, грудь 92, талия 74'), false);
});

test('contacts are blocked before payment', () => {
  for (const text of [
    'Напишите на test@example.com',
    'Мой Telegram @knit_master',
    'Телефон +7 (999) 123-45-67',
    'Ссылка https://example.com',
  ]) {
    assert.throws(
      () => decideMessageSending(order, 'customer-1', text),
      (error: unknown) => error instanceof DomainError && error.code === 'VALIDATION_ERROR',
    );
  }
});

test('contact can be shared after confirmed payment', () => {
  const decision = decideMessageSending(
    { ...order, paymentConfirmed: true },
    'customer-1',
    'Телефон +7 999 123-45-67',
  );
  assert.equal(decision.recipientId, 'master-1');
});

test('unrelated user cannot access chat', () => {
  assert.throws(
    () => decideMessageSending(order, 'intruder', 'Привет'),
    (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});
