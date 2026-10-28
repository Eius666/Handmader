import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../shared/domain/domain-error.ts';
import { requireChatParticipant } from './chat-access.ts';

const chat = { customerId: 'customer-1', masterId: 'master-1' };

test('chat access identifies both order participants', () => {
  assert.equal(requireChatParticipant(chat, 'customer-1'), 'customer');
  assert.equal(requireChatParticipant(chat, 'master-1'), 'master');
});

test('chat access rejects an unrelated user', () => {
  assert.throws(
    () => requireChatParticipant(chat, 'intruder'),
    (error: unknown) => error instanceof DomainError && error.code === 'FORBIDDEN',
  );
});
