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

export async function addResponse(
  orderId: string,
  masterId: string,
  response: Omit<OrderResponse, 'createdAt'>
): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), {
    [`responses.${masterId}`]: { ...response, createdAt: serverTimestamp() },
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
