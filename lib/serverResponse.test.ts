import assert from 'node:assert/strict';
import test from 'node:test';

import { readServerResponse } from './serverResponse.ts';

test('returns data from a successful JSON response', async () => {
  const response = Response.json({ data: { id: 'order-1' } });

  assert.deepEqual(
    await readServerResponse<{ id: string }>(response, 'fallback'),
    { id: 'order-1' },
  );
});

test('preserves an API error message', async () => {
  const response = Response.json({ error: 'Недостаточно прав' }, { status: 403 });

  await assert.rejects(
    readServerResponse(response, 'fallback'),
    /Недостаточно прав/,
  );
});

test('explains a Vercel security challenge instead of showing a generic error', async () => {
  const response = new Response('<!doctype html>', {
    status: 403,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-vercel-mitigated': 'challenge',
    },
  });

  await assert.rejects(
    readServerResponse(response, 'fallback'),
    /Защитная проверка Vercel прервала запрос/,
  );
});

test('explains an unexpected non-JSON server response', async () => {
  const response = new Response('<!doctype html>', {
    status: 502,
    headers: { 'content-type': 'text/html' },
  });

  await assert.rejects(
    readServerResponse(response, 'fallback'),
    /Сервер вернул некорректный ответ/,
  );
});
