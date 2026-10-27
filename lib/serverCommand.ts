'use client';

import { auth } from './firebase';

interface CommandErrorBody {
  error?: string;
}

export async function postServerCommand<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Требуется авторизация');

  const token = await currentUser.getIdToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({})) as CommandErrorBody & { data?: T };
  if (!response.ok || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
    throw new Error(payload.error ?? 'Не удалось выполнить операцию');
  }

  return payload.data as T;
}

export async function getServerQuery<T>(path: string): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Требуется авторизация');

  const token = await currentUser.getIdToken();
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({})) as CommandErrorBody & { data?: T };
  if (!response.ok || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
    throw new Error(payload.error ?? 'Не удалось загрузить данные');
  }

  return payload.data as T;
}
