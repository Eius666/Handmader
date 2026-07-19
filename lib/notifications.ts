import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification, CATEGORY_LABELS, NotificationType, OrderCategory } from '@/types';

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'handmader_bot';
const APP_URL = `https://t.me/${BOT_USERNAME}`;

function orderLink(orderId: string) {
  return `${APP_URL}?startapp=${orderId}`;
}

function chatLink(orderId: string) {
  return `https://t.me/${BOT_USERNAME}?startapp=chat_${orderId}`;
}

async function getUserTelegramId(uid: string): Promise<number | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return (snap.data()?.telegramId as number) ?? null;
  } catch {
    return null;
  }
}

async function sendNotify(telegramId: number, message: string): Promise<void> {
  await fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegramId, message }),
  });
}

// ─── In-app notifications ─────────────────────────────────────────────────────

export async function createInAppNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  meta?: { orderId?: string; chatId?: string },
): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    title,
    body,
    orderId: meta?.orderId ?? null,
    chatId: meta?.chatId ?? null,
    read: false,
    createdAt: serverTimestamp(),
  });
}

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
      const items: AppNotification[] = snap.docs.map((d) => ({
        id: d.id,
        userId: d.data().userId as string,
        type: d.data().type as NotificationType,
        title: d.data().title as string,
        body: d.data().body as string,
        orderId: d.data().orderId as string | undefined,
        chatId: d.data().chatId as string | undefined,
        read: d.data().read as boolean,
        createdAt: (d.data().createdAt as Timestamp)?.toDate() ?? new Date(),
      }));
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
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

// ─── Telegram + in-app notify functions ──────────────────────────────────────

/**
 * Notify a chat participant about a new incoming message.
 * Called fire-and-forget from sendMessage in firestore.ts.
 */
export async function notifyNewChatMessage(
  recipientTelegramId: number,
  senderName: string,
  orderTitle: string,
  messageText: string,
  orderId: string,
): Promise<void> {
  const shortText = messageText.length > 50 ? messageText.slice(0, 50) + '...' : messageText;
  const link = chatLink(orderId);
  const message =
    `💬 <b>Новое сообщение от ${senderName}</b>\n\n` +
    `Заказ: «${orderTitle}»\n` +
    `${shortText}\n\n` +
    `<a href="${link}">Открыть чат →</a>`;
  await sendNotify(recipientTelegramId, message);
}

/**
 * Notify all masters whose categories match the new order.
 * Called after createOrder.
 */
export async function notifyMastersAboutOrder(
  orderId: string,
  category: OrderCategory,
  description: string,
  budgetMin: number,
  budgetMax: number,
): Promise<void> {
  const snaps = await getDocs(
    query(collection(db, 'users'), where('role', 'in', ['master', 'both'])),
  );

  const link = orderLink(orderId);
  const categoryLabel = CATEGORY_LABELS[category];
  const shortDesc = description.slice(0, 100) + (description.length > 100 ? '…' : '');
  const message =
    `🧵 <b>Новый заказ</b>\n` +
    `Категория: ${categoryLabel}\n` +
    `${shortDesc}\n` +
    `Бюджет: ${budgetMin.toLocaleString('ru-RU')} — ${budgetMax.toLocaleString('ru-RU')} ₽\n\n` +
    `<a href="${link}">Откликнуться →</a>`;

  const notifBody = `${categoryLabel}: ${description.slice(0, 80)}${description.length > 80 ? '…' : ''}`;

  for (const snap of snaps.docs) {
    const data = snap.data();
    const cats = data.masterProfile?.categories as OrderCategory[] | undefined;
    if (cats && cats.length > 0 && !cats.includes(category)) continue;

    // Telegram
    const tgId = data.telegramId as number | undefined;
    if (tgId) void sendNotify(tgId, message);

    // In-app
    void createInAppNotification(snap.id, 'new_order', 'Новый заказ', notifBody, { orderId });
  }
}

/**
 * Notify customer that a master responded to their order.
 * Called after addResponse.
 */
export async function notifyCustomerNewResponse(
  customerId: string,
  orderId: string,
  orderDescription: string,
  masterName: string,
  price: number,
  timeline: string,
): Promise<void> {
  const tgId = await getUserTelegramId(customerId);
  const link = orderLink(orderId);
  const desc = orderDescription.slice(0, 60) + (orderDescription.length > 60 ? '…' : '');

  if (tgId) {
    const message =
      `👤 <b>${masterName}</b> откликнулся на ваш заказ\n` +
      `«${desc}»\n` +
      `Цена: ${price.toLocaleString('ru-RU')} ₽ · Срок: ${timeline}\n\n` +
      `<a href="${link}">Посмотреть →</a>`;
    void sendNotify(tgId, message);
  }

  void createInAppNotification(
    customerId,
    'new_response',
    `${masterName} откликнулся`,
    `${price.toLocaleString('ru-RU')} ₽ · ${timeline}`,
    { orderId },
  );
}

/**
 * Notify the selected master that they were chosen.
 * Called after selectMaster.
 */
export async function notifyMasterSelected(masterId: string, orderId: string): Promise<void> {
  const [tgId, snap] = await Promise.all([
    getUserTelegramId(masterId),
    getDoc(doc(db, 'orders', orderId)),
  ]);

  const desc = snap.exists() ? String(snap.data().description ?? '') : '';
  const shortDesc = desc.slice(0, 60) + (desc.length > 60 ? '…' : '');
  const link = orderLink(orderId);

  if (tgId) {
    const message =
      `✅ <b>Вас выбрали!</b>\n` +
      `Заказ: «${shortDesc}»\n\n` +
      `<a href="${link}">Перейти к заказу →</a>`;
    void sendNotify(tgId, message);
  }

  void createInAppNotification(
    masterId,
    'master_selected',
    'Вас выбрали!',
    shortDesc || 'Заказчик выбрал вас исполнителем',
    { orderId },
  );
}

/**
 * Notify customer that the master started working.
 * Called after startWork.
 */
export async function notifyCustomerWorkStarted(orderId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return;
  const { customerId, description } = snap.data() as { customerId: string; description: string };
  const desc = description.slice(0, 60) + (description.length > 60 ? '…' : '');
  const link = orderLink(orderId);

  const tgId = await getUserTelegramId(customerId);
  if (tgId) {
    const message =
      `🔧 Мастер начал работу над заказом\n` +
      `«${desc}»\n\n` +
      `<a href="${link}">Открыть →</a>`;
    void sendNotify(tgId, message);
  }

  void createInAppNotification(
    customerId,
    'work_started',
    'Мастер приступил к работе',
    desc,
    { orderId },
  );
}

/**
 * Notify customer that their order is ready.
 * Called after markReady.
 */
export async function notifyCustomerOrderReady(orderId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return;
  const { customerId, description } = snap.data() as { customerId: string; description: string };
  const desc = description.slice(0, 60) + (description.length > 60 ? '…' : '');
  const link = orderLink(orderId);

  const tgId = await getUserTelegramId(customerId);
  if (tgId) {
    const message =
      `✨ <b>Заказ готов!</b>\n` +
      `«${desc}»\n\n` +
      `<a href="${link}">Подтвердить получение →</a>`;
    void sendNotify(tgId, message);
  }

  void createInAppNotification(
    customerId,
    'order_ready',
    'Заказ готов!',
    desc,
    { orderId },
  );
}

/**
 * Notify admin that a master submitted a verification request.
 * Called fire-and-forget from submitVerification in firestore.ts.
 */
export async function notifyAdminVerificationRequest(
  masterName: string,
  masterId: string,
): Promise<void> {
  const adminIdStr = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;
  if (!adminIdStr) return;
  const adminId = Number(adminIdStr);
  if (!adminId) return;
  const message =
    `📝 <b>Новая заявка на верификацию</b>\n\n` +
    `Мастер: <b>${masterName}</b>\n` +
    `ID: <code>${masterId}</code>\n\n` +
    `Одобрить или отклонить:\n` +
    `Firebase Console → users → ${masterId}\n` +
    `Поле: <code>verificationStatus</code> → <code>verified</code> / <code>rejected</code>`;
  await sendNotify(adminId, message);
}

/**
 * Notify master that the order was completed by the customer.
 * Called after confirmDelivery.
 */
export async function notifyMasterOrderCompleted(
  orderId: string,
  masterId: string | null,
): Promise<void> {
  if (!masterId) return;
  const [tgId, snap] = await Promise.all([
    getUserTelegramId(masterId),
    getDoc(doc(db, 'orders', orderId)),
  ]);

  const desc = snap.exists() ? String(snap.data().description ?? '') : '';
  const shortDesc = desc.slice(0, 60) + (desc.length > 60 ? '…' : '');
  const link = orderLink(orderId);

  if (tgId) {
    const message =
      `🎉 <b>Заказ завершён!</b>\n` +
      `«${shortDesc}»\n` +
      `Спасибо за работу!\n\n` +
      `<a href="${link}">Открыть →</a>`;
    void sendNotify(tgId, message);
  }

  void createInAppNotification(
    masterId,
    'order_completed',
    'Заказ завершён!',
    shortDesc || 'Клиент подтвердил получение заказа',
    { orderId },
  );
}
