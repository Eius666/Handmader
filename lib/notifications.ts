import { getDoc, getDocs, collection, query, where, doc } from 'firebase/firestore';
import { db } from './firebase';
import { CATEGORY_LABELS, OrderCategory } from '@/types';

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME ?? 'handmader_bot';
const APP_URL = `https://t.me/${BOT_USERNAME}`;

function orderLink(orderId: string) {
  return `${APP_URL}?startapp=${orderId}`;
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

function chatLink(orderId: string) {
  return `https://t.me/${BOT_USERNAME}?startapp=chat_${orderId}`;
}

// ─── Public notify functions (all fire-and-forget safe) ───────────────────────

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
  const shortText = messageText.length > 50
    ? messageText.slice(0, 50) + '...'
    : messageText;
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
  const message =
    `🧵 <b>Новый заказ</b>\n` +
    `Категория: ${CATEGORY_LABELS[category]}\n` +
    `${description.slice(0, 100)}${description.length > 100 ? '…' : ''}\n` +
    `Бюджет: ${budgetMin.toLocaleString('ru-RU')} — ${budgetMax.toLocaleString('ru-RU')} ₽\n\n` +
    `<a href="${link}">Откликнуться →</a>`;

  for (const snap of snaps.docs) {
    const data = snap.data();
    const tgId = data.telegramId as number | undefined;
    if (!tgId) continue;
    // Skip masters whose categories don't include this order's category
    const cats = data.masterProfile?.categories as OrderCategory[] | undefined;
    if (cats && cats.length > 0 && !cats.includes(category)) continue;
    void sendNotify(tgId, message);
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
  if (!tgId) return;
  const link = orderLink(orderId);
  const desc = orderDescription.slice(0, 60) + (orderDescription.length > 60 ? '…' : '');
  const message =
    `👤 <b>${masterName}</b> откликнулся на ваш заказ\n` +
    `«${desc}»\n` +
    `Цена: ${price.toLocaleString('ru-RU')} ₽ · Срок: ${timeline}\n\n` +
    `<a href="${link}">Посмотреть →</a>`;
  void sendNotify(tgId, message);
}

/**
 * Notify the selected master that they were chosen.
 * Called after selectMaster.
 */
export async function notifyMasterSelected(
  masterId: string,
  orderId: string,
): Promise<void> {
  const [tgId, snap] = await Promise.all([
    getUserTelegramId(masterId),
    getDoc(doc(db, 'orders', orderId)),
  ]);
  if (!tgId || !snap.exists()) return;
  const desc = String(snap.data().description ?? '');
  const link = orderLink(orderId);
  const message =
    `✅ <b>Вас выбрали!</b>\n` +
    `Заказ: «${desc.slice(0, 60)}${desc.length > 60 ? '…' : ''}»\n\n` +
    `<a href="${link}">Перейти к заказу →</a>`;
  void sendNotify(tgId, message);
}

/**
 * Notify customer that the master started working.
 * Called after startWork.
 */
export async function notifyCustomerWorkStarted(orderId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return;
  const { customerId, description } = snap.data() as { customerId: string; description: string };
  const tgId = await getUserTelegramId(customerId);
  if (!tgId) return;
  const link = orderLink(orderId);
  const desc = description.slice(0, 60) + (description.length > 60 ? '…' : '');
  const message =
    `🔧 Мастер начал работу над заказом\n` +
    `«${desc}»\n\n` +
    `<a href="${link}">Открыть →</a>`;
  void sendNotify(tgId, message);
}

/**
 * Notify customer that their order is ready.
 * Called after markReady.
 */
export async function notifyCustomerOrderReady(orderId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return;
  const { customerId, description } = snap.data() as { customerId: string; description: string };
  const tgId = await getUserTelegramId(customerId);
  if (!tgId) return;
  const link = orderLink(orderId);
  const desc = description.slice(0, 60) + (description.length > 60 ? '…' : '');
  const message =
    `✨ <b>Заказ готов!</b>\n` +
    `«${desc}»\n\n` +
    `<a href="${link}">Подтвердить получение →</a>`;
  void sendNotify(tgId, message);
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
  if (!tgId || !snap.exists()) return;
  const desc = String(snap.data().description ?? '');
  const link = orderLink(orderId);
  const message =
    `🎉 <b>Заказ завершён!</b>\n` +
    `«${desc.slice(0, 60)}${desc.length > 60 ? '…' : ''}»\n` +
    `Спасибо за работу!\n\n` +
    `<a href="${link}">Открыть →</a>`;
  void sendNotify(tgId, message);
}
