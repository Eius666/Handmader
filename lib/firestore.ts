import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Order, OrderResponse, User, Review, OrderCategory } from '@/types';

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
}

export async function markReady(orderId: string): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), { status: 'ready', readyAt: serverTimestamp() });
}

export async function confirmDelivery(orderId: string): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), { status: 'completed', deliveredAt: serverTimestamp() });
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
  const clean = stripUndefined({ ...response, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'orders', orderId), {
    [`responses.${masterId}`]: clean,
  });
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapOrder(id: string, data: Record<string, unknown>): Order {
  return {
    ...data,
    id,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
  } as Order;
}
