import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { createPublicAlias } from '@/modules/users/domain/public-alias';
import {
  canActorReadOrder,
  canMasterDiscoverOrder,
  type OrderAccessSnapshot,
  type OrderActorSnapshot,
} from '../../domain/order-access';

export interface OrderDto {
  id: string;
  customerId: string;
  customerName: string;
  title?: string;
  description: string;
  category: string;
  photos: string[];
  budgetMin: number;
  budgetMax: number;
  deadline: string;
  status: string;
  createdAt: string;
  selectedMasterId?: string;
  selectedMasterName?: string;
  selectedPrice?: number;
  responseCount: number;
  ratings?: Array<{ rating: number; comment?: string; createdAt: string; userId?: string }>;
  measurements?: string;
  location?: string;
  deliveryOption?: 'local' | 'delivery' | 'both';
}

export async function getOrderForActorFromFirestore(
  orderId: string,
  actorId: string,
): Promise<OrderDto> {
  const orderRef = adminDb.collection('orders').doc(orderId);
  const [orderSnapshot, actor, ownProposal] = await Promise.all([
    orderRef.get(),
    loadOrderActor(actorId),
    orderRef.collection('proposals').doc(actorId).get(),
  ]);
  if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
  const data = orderSnapshot.data() ?? {};
  const access = orderAccessSnapshot(data);
  const legacyResponses = asRecord(data.responses);
  const hasOwnProposal = ownProposal.exists || Object.prototype.hasOwnProperty.call(legacyResponses, actorId);
  if (!canActorReadOrder(access, actor, hasOwnProposal)) {
    throw new DomainError('FORBIDDEN', 'Этот заказ вам недоступен');
  }
  return orderDto(orderSnapshot.id, data, actorId);
}

export async function listOrdersForActorFromFirestore(
  actorId: string,
  scope: 'mine' | 'feed',
): Promise<OrderDto[]> {
  const actor = await loadOrderActor(actorId);
  if (scope === 'mine') {
    const snapshot = await adminDb.collection('orders')
      .where('customerId', '==', actorId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return snapshot.docs.map((item) => orderDto(item.id, item.data(), actorId));
  }

  if (actor.role !== 'master' && actor.role !== 'both') return [];
  if (actor.categories.length === 0) return [];
  const snapshot = await adminDb.collection('orders')
    .where('status', '==', 'awaiting_responses')
    .where('category', 'in', actor.categories.slice(0, 30))
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  return snapshot.docs
    .filter((item) => canMasterDiscoverOrder(orderAccessSnapshot(item.data()), actor))
    .map((item) => orderDto(item.id, item.data(), actorId));
}

async function loadOrderActor(actorId: string): Promise<OrderActorSnapshot> {
  const [privateSnapshot, publicSnapshot] = await Promise.all([
    adminDb.collection('users').doc(actorId).get(),
    adminDb.collection('publicProfiles').doc(actorId).get(),
  ]);
  if (!privateSnapshot.exists) throw new DomainError('FORBIDDEN', 'Профиль пользователя не найден');
  const privateData = privateSnapshot.data() ?? {};
  const privateMaster = asRecord(privateData.masterProfile);
  const publicData = publicSnapshot.data() ?? {};
  const categoriesSource = Array.isArray(publicData.categories)
    ? publicData.categories
    : privateMaster.categories;
  return {
    id: actorId,
    role: privateData.role,
    categories: Array.isArray(categoriesSource)
      ? categoriesSource.filter((item): item is string => typeof item === 'string')
      : [],
    city: stringValue(publicData.city) || stringValue(privateMaster.location),
    verified: publicSnapshot.exists
      ? publicData.verified === true
      : privateData.verificationStatus === 'verified',
  };
}

function orderAccessSnapshot(data: Record<string, unknown>): OrderAccessSnapshot {
  const deliveryOption = data.deliveryOption === 'local'
    || data.deliveryOption === 'delivery'
    || data.deliveryOption === 'both'
    ? data.deliveryOption
    : undefined;
  return {
    customerId: stringValue(data.customerId),
    selectedMasterId: stringValue(data.selectedMasterId) || undefined,
    status: stringValue(data.status),
    category: stringValue(data.category),
    location: stringValue(data.location) || undefined,
    deliveryOption,
  };
}

function orderDto(id: string, data: Record<string, unknown>, actorId: string): OrderDto {
  const customerId = stringValue(data.customerId);
  const selectedMasterId = stringValue(data.selectedMasterId) || undefined;
  const isCustomer = customerId === actorId;
  const isSelectedMaster = selectedMasterId === actorId;
  const deliveryOption = data.deliveryOption === 'local'
    || data.deliveryOption === 'delivery'
    || data.deliveryOption === 'both'
    ? data.deliveryOption
    : undefined;
  const result: OrderDto = {
    id,
    customerId: isCustomer ? customerId : '',
    customerName: createPublicAlias('customer', customerId),
    title: stringValue(data.title) || undefined,
    description: stringValue(data.description),
    category: stringValue(data.category) || 'other',
    photos: stringArray(data.photos),
    budgetMin: numberValue(data.budgetMin),
    budgetMax: numberValue(data.budgetMax),
    deadline: stringValue(data.deadline),
    status: stringValue(data.status),
    createdAt: timestampIso(data.createdAt),
    responseCount: numberValue(data.responseCount),
  };
  if (selectedMasterId && (isCustomer || isSelectedMaster)) {
    result.selectedMasterId = selectedMasterId;
    result.selectedMasterName = createPublicAlias('master', selectedMasterId);
    if (typeof data.selectedPrice === 'number') result.selectedPrice = data.selectedPrice;
  }
  if (typeof data.measurements === 'string') result.measurements = data.measurements;
  if (typeof data.location === 'string') result.location = data.location;
  if (deliveryOption) result.deliveryOption = deliveryOption;
  if (Array.isArray(data.ratings) && (isCustomer || isSelectedMaster)) {
    result.ratings = data.ratings
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        rating: numberValue(item.rating),
        ...(typeof item.comment === 'string' ? { comment: item.comment } : {}),
        createdAt: timestampIso(item.createdAt),
        ...(item.userId === actorId ? { userId: actorId } : {}),
      }));
  }
  return result;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function timestampIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}
