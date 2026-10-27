import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import type { AppNotification, NotificationType } from '@/types';
import { db } from './firebase';

// Notifications are created only by trusted server commands. The browser can
// subscribe and update read state, but cannot create events or call channels.

export function subscribeToUnreadCount(
  uid: string,
  callback: (count: number) => void,
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    where('read', '==', false),
  );
  return onSnapshot(q, (snap) => callback(snap.size), () => callback(0));
}

export function subscribeToNotifications(
  uid: string,
  callback: (notifications: AppNotification[]) => void,
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(30),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: AppNotification[] = snap.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          userId: String(data.userId ?? ''),
          type: data.type as NotificationType,
          title: String(data.title ?? ''),
          body: String(data.body ?? ''),
          ...(typeof data.orderId === 'string' && data.orderId ? { orderId: data.orderId } : {}),
          ...(typeof data.chatId === 'string' && data.chatId ? { chatId: data.chatId } : {}),
          read: data.read === true,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        };
      });
      callback(items);
    },
    () => callback([]),
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      where('read', '==', false),
    ),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((item) => batch.update(item.ref, { read: true }));
  await batch.commit();
}
