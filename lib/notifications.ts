'use client';

import type { AppNotification, NotificationType } from '@/types';
import { getServerQuery, postServerCommand } from './serverCommand';

interface ServerNotificationDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  orderId?: string;
  chatId?: string;
  read: boolean;
  createdAt: string;
}

const POLL_INTERVAL_MS = 15_000;

export function subscribeToUnreadCount(
  uid: string,
  callback: (count: number) => void,
): () => void {
  void uid;
  return poll(async () => {
    const result = await getServerQuery<{ count: number }>('/api/notifications?mode=unread');
    callback(result.count);
  }, () => callback(0));
}

export function subscribeToNotifications(
  _uid: string,
  callback: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return poll(async () => {
    const items = await getServerQuery<ServerNotificationDto[]>('/api/notifications?mode=list');
    callback(items.map((item) => ({
      id: item.id,
      userId: item.userId,
      type: item.type as NotificationType,
      title: item.title,
      body: item.body,
      ...(item.orderId ? { orderId: item.orderId } : {}),
      ...(item.chatId ? { chatId: item.chatId } : {}),
      read: item.read,
      createdAt: new Date(item.createdAt),
    })));
  }, onError);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await postServerCommand('/api/notifications', { action: 'mark_read', notificationId });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  void uid;
  await postServerCommand('/api/notifications', { action: 'mark_all_read' });
}

function poll(run: () => Promise<void>, onError?: (error: Error) => void): () => void {
  let stopped = false;
  let running = false;

  const execute = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await run();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Не удалось загрузить уведомления'));
    } finally {
      running = false;
    }
  };

  void execute();
  const interval = window.setInterval(() => void execute(), POLL_INTERVAL_MS);
  return () => {
    stopped = true;
    window.clearInterval(interval);
  };
}
