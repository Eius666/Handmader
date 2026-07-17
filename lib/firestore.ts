import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  increment,
  onSnapshot,
  writeBatch,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Order, OrderResponse, User, Review, OrderCategory, Chat, ChatMessage } from '@/types';
import {
  notifyMastersAboutOrder,
  notifyCustomerNewResponse,
  notifyMasterSelected,
  notifyCustomerWorkStarted,
  notifyCustomerOrderReady,
  notifyMasterOrderCompleted,
  notifyNewChatMessage,
} from './notifications';

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email:          data.email          ?? '',
    displayName:    data.displayName    ?? '',
    role:           data.role           ?? null,
    // old docs pre-dating hasSelectedRole default to true (they already picked a role)
    hasSelectedRole: data.hasSelectedRole ?? true,
    createdAt:      (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    masterProfile:  data.masterProfile,
  } as User;
}

export async function setUser(uid: string, data: Partial<User>): Promise<void> {
  await setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(
  order: Omit<Order, 'id' | 'createdAt' | 'responses' | 'status'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'orders'), {
    ...order,
    status: 'awaiting_responses',
    responses: {},
    createdAt: serverTimestamp(),
  });
  // fire-and-forget — notify relevant masters
  notifyMastersAboutOrder(ref.id, order.category, order.description, order.budgetMin, order.budgetMax).catch(console.error);
  return ref.id;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return null;
  return mapOrder(snap.id, snap.data());
}

export async function getCustomerOrders(customerId: string): Promise<Order[]> {
  const q = query(
    collection(db, 'orders'),
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc')
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => mapOrder(d.id, d.data()));
}

export async function getAvailableOrders(category?: OrderCategory): Promise<Order[]> {
  let q = query(
    collection(db, 'orders'),
    where('status', '==', 'awaiting_responses'),
    orderBy('createdAt', 'desc')
  );
  if (category) {
    q = query(
      collection(db, 'orders'),
      where('status', '==', 'awaiting_responses'),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
  }
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => mapOrder(d.id, d.data()));
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  extra?: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), { status, ...extra });
}

export async function startWork(orderId: string): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), { status: 'in_progress', startedAt: serverTimestamp() });
  notifyCustomerWorkStarted(orderId).catch(console.error);
}

export async function markReady(orderId: string): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), { status: 'ready', readyAt: serverTimestamp() });
  notifyCustomerOrderReady(orderId).catch(console.error);
}

export async function confirmDelivery(orderId: string): Promise<void> {
  console.log('[confirmDelivery] called for order:', orderId);

  await updateDoc(doc(db, 'orders', orderId), { status: 'completed', deliveredAt: serverTimestamp() });

  const snap = await getDoc(doc(db, 'orders', orderId));
  const orderData = snap.exists() ? snap.data() : null;
  console.log('[confirmDelivery] order snapshot:', JSON.stringify(orderData));
  console.log('[confirmDelivery] selectedMasterId:', orderData?.selectedMasterId);

  const masterId = orderData?.selectedMasterId as string | undefined;
  if (masterId) {
    await updateDoc(doc(db, 'users', masterId), {
      'masterProfile.completedOrders': increment(1),
    });
    const updatedProfile = await getDoc(doc(db, 'users', masterId));
    console.log('[confirmDelivery] updated masterProfile:', JSON.stringify(updatedProfile.data()?.masterProfile));
  } else {
    console.warn('[confirmDelivery] no selectedMasterId — increment skipped');
  }
  notifyMasterOrderCompleted(orderId, masterId ?? null).catch(console.error);
}

export async function submitRating(
  orderId: string,
  masterId: string,
  userId: string,
  rating: number,
  comment?: string,
): Promise<void> {
  const entry: Record<string, unknown> = { rating, userId, createdAt: Timestamp.now() };
  if (comment) entry.comment = comment;

  await updateDoc(doc(db, 'orders', orderId), { ratings: arrayUnion(entry) });

  const masterSnap = await getDoc(doc(db, 'users', masterId));
  if (!masterSnap.exists()) return;
  const mp = (masterSnap.data().masterProfile ?? {}) as { rating?: number; ratingCount?: number };
  const oldCount  = mp.ratingCount ?? 0;
  const newCount  = oldCount + 1;
  const newRating = ((mp.rating ?? 0) * oldCount + rating) / newCount;

  await updateDoc(doc(db, 'users', masterId), {
    'masterProfile.rating':      newRating,
    'masterProfile.ratingCount': newCount,
  });
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export async function addResponse(
  orderId: string,
  masterId: string,
  response: Omit<OrderResponse, 'createdAt'>
): Promise<void> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (snap.exists() && snap.data().responses && masterId in snap.data().responses) {
    throw new Error('Вы уже откликнулись на этот заказ');
  }
  const orderData = snap.exists() ? snap.data() : null;
  const clean = stripUndefined({ ...response, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'orders', orderId), {
    [`responses.${masterId}`]: clean,
  });
  if (orderData) {
    notifyCustomerNewResponse(
      orderData.customerId as string,
      orderId,
      orderData.description as string,
      response.masterName,
      response.price,
      response.timeline,
    ).catch(console.error);
  }
}

export async function deleteOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, 'orders', orderId));
}

export async function selectMaster(
  orderId: string,
  masterId: string,
  masterName: string,
  selectedPrice: number
): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), {
    status: 'master_selected',
    selectedMasterId: masterId,
    selectedMasterName: masterName,
    selectedPrice,
  });
  notifyMasterSelected(masterId, orderId).catch(console.error);
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export async function createReview(
  review: Omit<Review, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'reviews'), {
    ...review,
    createdAt: serverTimestamp(),
  });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

/**
 * Send a message. Creates the chat document on first call (with createdAt),
 * then only updates lastMessage + increments the receiver's unread counter.
 */
export async function sendMessage(
  orderId: string,
  senderId: string,
  senderName: string,
  text: string,
  customerId: string,
  masterId: string,
  customerName = '',
  masterName = '',
): Promise<void> {
  const chatRef = doc(db, 'chats', orderId);
  const chatSnap = await getDoc(chatRef);
  const unreadField = senderId === customerId ? 'unreadMaster' : 'unreadCustomer';

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      orderId,
      customerId,
      masterId,
      customerName,
      masterName,
      lastMessage: text.slice(0, 100),
      lastMessageAt: serverTimestamp(),
      unreadCustomer: senderId === customerId ? 0 : 1,
      unreadMaster:   senderId === customerId ? 1 : 0,
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(chatRef, {
      lastMessage: text.slice(0, 100),
      lastMessageAt: serverTimestamp(),
      [unreadField]: increment(1),
    });
  }

  await addDoc(collection(db, 'chats', orderId, 'messages'), {
    senderId,
    senderName,
    text,
    createdAt: serverTimestamp(),
    read: false,
  });

  // Fire-and-forget: notify the other party about the new message
  const recipientUid = senderId === customerId ? masterId : customerId;
  if (recipientUid) {
    (async () => {
      const [recipientSnap, orderSnap] = await Promise.all([
        getDoc(doc(db, 'users', recipientUid)),
        getDoc(doc(db, 'orders', orderId)),
      ]);
      const tgId = recipientSnap.data()?.telegramId as number | undefined;
      if (!tgId) return;
      const desc = String(orderSnap.data()?.description ?? '');
      const title = desc.length > 40 ? desc.slice(0, 40) + '…' : desc;
      await notifyNewChatMessage(tgId, senderName, title, text, orderId);
    })().catch(console.error);
  }
}

/**
 * Subscribe to chat messages in real time. Returns the unsubscribe function.
 */
export function subscribeToChatMessages(
  orderId: string,
  callback: (messages: ChatMessage[]) => void,
  limitCount = 50,
): () => void {
  const q = query(
    collection(db, 'chats', orderId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(limitCount),
  );
  return onSnapshot(q, (snap) => {
    const messages: ChatMessage[] = snap.docs.map((d) => ({
      id: d.id,
      senderId:   d.data().senderId   as string,
      senderName: d.data().senderName as string,
      text:       d.data().text       as string,
      read:       d.data().read       as boolean,
      createdAt:  (d.data().createdAt as Timestamp)?.toDate() ?? new Date(),
    }));
    callback(messages);
  });
}

/**
 * Mark all messages from the other party as read and reset the reader's unread counter.
 */
export async function markMessagesAsRead(orderId: string, readerId: string): Promise<void> {
  const [unreadSnap, chatSnap] = await Promise.all([
    getDocs(query(
      collection(db, 'chats', orderId, 'messages'),
      where('read', '==', false),
    )),
    getDoc(doc(db, 'chats', orderId)),
  ]);

  const batch = writeBatch(db);
  let hasUpdates = false;
  for (const msgDoc of unreadSnap.docs) {
    if ((msgDoc.data().senderId as string) !== readerId) {
      batch.update(msgDoc.ref, { read: true });
      hasUpdates = true;
    }
  }
  if (hasUpdates) await batch.commit();

  if (chatSnap.exists()) {
    const isCustomer = (chatSnap.data().customerId as string) === readerId;
    await updateDoc(doc(db, 'chats', orderId), {
      [isCustomer ? 'unreadCustomer' : 'unreadMaster']: 0,
    });
  }
}

/**
 * Get all chats for a user (as customer or master), sorted by lastMessageAt desc.
 */
export async function getChatList(uid: string): Promise<Chat[]> {
  // Two simple where-only queries (no orderBy) to avoid requiring composite indexes.
  // Client-side sort by lastMessageAt desc.
  const [asCustomer, asMaster] = await Promise.all([
    getDocs(query(collection(db, 'chats'), where('customerId', '==', uid))),
    getDocs(query(collection(db, 'chats'), where('masterId',   '==', uid))),
  ]);

  const all = [...asCustomer.docs, ...asMaster.docs].map((d) => {
    const data = d.data();
    return {
      orderId:        d.id,
      customerId:     data.customerId    as string,
      masterId:       data.masterId      as string,
      customerName:   data.customerName  as string | undefined,
      masterName:     data.masterName    as string | undefined,
      lastMessage:    data.lastMessage   as string ?? '',
      unreadCustomer: (data.unreadCustomer as number) ?? 0,
      unreadMaster:   (data.unreadMaster   as number) ?? 0,
      lastMessageAt:  (data.lastMessageAt  as Timestamp)?.toDate() ?? new Date(),
      createdAt:      (data.createdAt      as Timestamp)?.toDate() ?? new Date(),
    } satisfies Chat;
  });

  return all.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapOrder(id: string, data: Record<string, unknown>): Order {
  return {
    ...data,
    id,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  } as Order;
}
