'use client';

import { auth } from './firebase';
import { readServerResponse } from './serverResponse';

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

  return readServerResponse<T>(response, 'Не удалось выполнить операцию');
}

export async function deleteServerCommand<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Требуется авторизация');

  const token = await currentUser.getIdToken();
  const response = await fetch(path, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return readServerResponse<T>(response, 'Не удалось выполнить операцию');
}

export async function getServerQuery<T>(path: string): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Требуется авторизация');

  const token = await currentUser.getIdToken();
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readServerResponse<T>(response, 'Не удалось загрузить данные');
}
