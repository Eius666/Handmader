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
