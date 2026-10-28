interface ServerResponseBody<T> {
  data?: T;
  error?: string;
}

const VERCEL_CHALLENGE_ERROR =
  'Защитная проверка Vercel прервала запрос. Обновите страницу и повторите операцию.';

const INVALID_RESPONSE_ERROR =
  'Сервер вернул некорректный ответ. Обновите страницу и повторите операцию.';

export async function readServerResponse<T>(
  response: Response,
  fallbackError: string,
): Promise<T> {
  if (response.headers.get('x-vercel-mitigated') === 'challenge') {
    throw new Error(VERCEL_CHALLENGE_ERROR);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(INVALID_RESPONSE_ERROR);
  }

  let payload: ServerResponseBody<T>;
  try {
    payload = await response.json() as ServerResponseBody<T>;
  } catch {
    throw new Error(INVALID_RESPONSE_ERROR);
  }

  if (!response.ok || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
    throw new Error(payload.error ?? fallbackError);
  }

  return payload.data as T;
}
