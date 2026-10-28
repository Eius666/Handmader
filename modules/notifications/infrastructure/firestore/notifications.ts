import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';

export interface NotificationDto {
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

export async function listNotificationsForActorFromFirestore(
  actorId: string,
): Promise<NotificationDto[]> {
  const snapshot = await adminDb.collection('notifications')
    .where('userId', '==', actorId)
    .orderBy('createdAt', 'desc')
    .limit(30)
    .get();

  return snapshot.docs.map((item) => notificationDto(item.id, item.data()));
}

export async function countUnreadNotificationsForActorFromFirestore(
  actorId: string,
): Promise<number> {
  const snapshot = await adminDb.collection('notifications')
    .where('userId', '==', actorId)
    .where('read', '==', false)
    .count()
    .get();
  return snapshot.data().count;
}

export async function markNotificationReadForActorInFirestore(
  actorId: string,
  notificationId: string,
): Promise<void> {
  const ref = adminDb.collection('notifications').doc(notificationId);
  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new DomainError('NOT_FOUND', 'Уведомление не найдено');
    if (snapshot.data()?.userId !== actorId) {
      throw new DomainError('FORBIDDEN', 'Нельзя изменить чужое уведомление');
    }
    if (snapshot.data()?.read !== true) {
      transaction.update(ref, { read: true, readAt: Timestamp.now() });
    }
  });
}

export async function markAllNotificationsReadForActorInFirestore(actorId: string): Promise<void> {
  const snapshot = await adminDb.collection('notifications')
    .where('userId', '==', actorId)
    .where('read', '==', false)
    .get();
  if (snapshot.empty) return;

  for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
    const batch = adminDb.batch();
    const now = Timestamp.now();
    for (const item of snapshot.docs.slice(offset, offset + 400)) {
      batch.update(item.ref, { read: true, readAt: now });
    }
    await batch.commit();
  }
}

function notificationDto(id: string, data: Record<string, unknown>): NotificationDto {
  return {
    id,
    userId: String(data.userId ?? ''),
    type: String(data.type ?? ''),
    title: String(data.title ?? ''),
    body: String(data.body ?? ''),
    ...(typeof data.orderId === 'string' && data.orderId ? { orderId: data.orderId } : {}),
    ...(typeof data.chatId === 'string' && data.chatId ? { chatId: data.chatId } : {}),
    read: data.read === true,
    createdAt: data.createdAt instanceof Timestamp
      ? data.createdAt.toDate().toISOString()
      : new Date(0).toISOString(),
  };
}
