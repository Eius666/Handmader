import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('proposals support collection-group lookup by masterId', async () => {
  const source = await readFile(new URL('../../firestore.indexes.json', import.meta.url), 'utf8');
  const config = JSON.parse(source);
  const override = config.fieldOverrides?.find((candidate) =>
    candidate.collectionGroup === 'proposals' && candidate.fieldPath === 'masterId');

  assert.ok(override, 'proposals.masterId field override is required');
  assert.ok(
    override.indexes?.some((index) =>
      index.order === 'ASCENDING' && index.queryScope === 'COLLECTION_GROUP'),
    'proposals.masterId must have a COLLECTION_GROUP ascending index',
  );
});

test('chat cycles can page current messages without exposing earlier selection history', async () => {
  const source = await readFile(new URL('../../firestore.indexes.json', import.meta.url), 'utf8');
  const config = JSON.parse(source);
  const indexes = config.indexes?.filter((candidate) => candidate.collectionGroup === 'messages') ?? [];

  assert.ok(indexes.some((index) =>
    index.fields?.[0]?.fieldPath === 'chatCycle'
    && index.fields?.[1]?.fieldPath === 'createdAt'),
  'messages need chatCycle + createdAt index');
  assert.ok(indexes.some((index) =>
    index.fields?.[0]?.fieldPath === 'read'
    && index.fields?.[1]?.fieldPath === 'chatCycle'),
  'messages need read + chatCycle index');
});
