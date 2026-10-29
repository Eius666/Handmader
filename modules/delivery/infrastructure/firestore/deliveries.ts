import 'server-only';

import { Timestamp, type DocumentData } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import {
  decideAutomaticAcceptance,
  decideDeliveryStart,
  decideOrderAcceptance,
  decideReceiptConfirmation,
  type DeliveryStatus,
} from '../../domain/delivery';

export interface DeliveryDto {
  orderId: string;
  method: 'local' | 'delivery';
  status: DeliveryStatus;
  carrier?: string;
  trackingNumber?: string;
  startedAt: string;
  deliveredAt?: string;
  acceptanceDueAt?: string;
  acceptedAt?: string;
  acceptedAutomatically?: boolean;
}

interface Command { orderId: string; actorId: string; commandId: string }

export async function getDeliveryFromFirestore(orderId: string, actorId: string): Promise<DeliveryDto | null> {
  const orderRef = adminDb.collection('orders').doc(orderId);
  const deliveryRef = adminDb.collection('deliveries').doc(orderId);
  const [orderSnapshot, deliverySnapshot] = await Promise.all([orderRef.get(), deliveryRef.get()]);
  if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
  const order = orderSnapshot.data() ?? {};
  if (actorId !== order.customerId && actorId !== order.selectedMasterId) {
    throw new DomainError('FORBIDDEN', 'Доставка доступна только участникам заказа');
  }
  return deliverySnapshot.exists ? toDto(deliverySnapshot.data() ?? {}) : null;
}

export async function startDeliveryInFirestore(command: Command & { carrier?: unknown; trackingNumber?: unknown }): Promise<DeliveryDto> {
  const refs = refsFor(command);
  const agreementRef = adminDb.collection('agreements').doc(command.orderId);
  return adminDb.runTransaction(async (transaction) => {
    const [receipt, orderSnapshot, agreementSnapshot, deliverySnapshot] = await Promise.all([
      transaction.get(refs.receipt), transaction.get(refs.order), transaction.get(agreementRef), transaction.get(refs.delivery),
    ]);
    if (receipt.exists) return receipt.data()?.result as DeliveryDto;
    if (!orderSnapshot.exists || !agreementSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ или соглашение не найдено');
    if (deliverySnapshot.exists) throw new DomainError('INVALID_STATE', 'Передача заказа уже начата');
    const order = orderSnapshot.data() ?? {};
    const agreement = agreementSnapshot.data() ?? {};
    const decision = decideDeliveryStart(toOrder(orderSnapshot.id, order), {
      status: String(agreement.status ?? ''),
      deliveryMethod: agreement.deliveryMethod === 'delivery' ? 'delivery' : 'local',
    }, command.actorId, command);
    const now = Timestamp.now();
    const data = {
      orderId: command.orderId,
      customerId: String(order.customerId ?? ''),
      masterId: String(order.selectedMasterId ?? ''),
      method: decision.method,
      status: decision.status,
      ...('carrier' in decision ? { carrier: decision.carrier, trackingNumber: decision.trackingNumber } : {}),
      masterConfirmedAt: now,
      startedAt: now,
      updatedAt: now,
    };
    const result = toDto(data);
    transaction.create(refs.delivery, data);
    transaction.update(refs.order, { status: 'in_delivery', deliveryStatus: decision.status, updatedAt: now });
    writeSideEffects(transaction, refs, command, result, now, {
      eventType: 'delivery_started',
      notifyUserId: data.customerId,
      title: decision.method === 'delivery' ? 'Заказ передан в доставку' : 'Мастер готов передать заказ',
      body: decision.method === 'delivery'
        ? `${decision.carrier}, трек-номер ${decision.trackingNumber}`
        : 'Подтвердите получение изделия при личной встрече',
      commandType: 'start_delivery',
    });
    return result;
  });
}

export async function confirmReceiptInFirestore(command: Command): Promise<DeliveryDto> {
  const refs = refsFor(command);
  return adminDb.runTransaction(async (transaction) => {
    const [receipt, orderSnapshot, deliverySnapshot] = await Promise.all([
      transaction.get(refs.receipt), transaction.get(refs.order), transaction.get(refs.delivery),
    ]);
    if (receipt.exists) return receipt.data()?.result as DeliveryDto;
    if (!orderSnapshot.exists || !deliverySnapshot.exists) throw new DomainError('NOT_FOUND', 'Передача заказа не найдена');
    const order = orderSnapshot.data() ?? {};
    const delivery = deliverySnapshot.data() ?? {};
    const now = Timestamp.now();
    const decision = decideReceiptConfirmation(toOrder(orderSnapshot.id, order), toDelivery(delivery), command.actorId, now.toMillis());
    const acceptanceDueAt = Timestamp.fromMillis(decision.acceptanceDueAtMs);
    const updated = { ...delivery, status: decision.status, customerConfirmedAt: now, deliveredAt: now, acceptanceDueAt, updatedAt: now };
    const result = toDto(updated);
    transaction.update(refs.delivery, { status: decision.status, customerConfirmedAt: now, deliveredAt: now, acceptanceDueAt, updatedAt: now });
    transaction.update(refs.order, { status: 'delivered', deliveryStatus: decision.status, deliveredAt: now, acceptanceDueAt, updatedAt: now });
    writeSideEffects(transaction, refs, command, result, now, {
      eventType: 'delivery_received', notifyUserId: String(order.selectedMasterId ?? ''),
      title: 'Получение подтверждено', body: 'У заказчика есть 5 дней на приёмку или открытие спора', commandType: 'confirm_delivery_receipt',
    });
    return result;
  });
}

export async function acceptDeliveryInFirestore(command: Command): Promise<DeliveryDto> {
  const refs = refsFor(command);
  return adminDb.runTransaction(async (transaction) => {
    const [receipt, orderSnapshot, deliverySnapshot] = await Promise.all([
      transaction.get(refs.receipt), transaction.get(refs.order), transaction.get(refs.delivery),
    ]);
    if (receipt.exists) return receipt.data()?.result as DeliveryDto;
    if (!orderSnapshot.exists || !deliverySnapshot.exists) throw new DomainError('NOT_FOUND', 'Передача заказа не найдена');
    const order = orderSnapshot.data() ?? {};
    const delivery = deliverySnapshot.data() ?? {};
    const decision = decideOrderAcceptance(toOrder(orderSnapshot.id, order), toDelivery(delivery), command.actorId);
    const now = Timestamp.now();
    const updated = { ...delivery, status: decision.status, acceptedAt: now, acceptedAutomatically: false, updatedAt: now };
    const result = toDto(updated);
    transaction.update(refs.delivery, { status: decision.status, acceptedAt: now, acceptedAutomatically: false, updatedAt: now });
    transaction.update(refs.order, { status: 'accepted', deliveryStatus: decision.status, acceptedAt: now, updatedAt: now });
    writeSideEffects(transaction, refs, command, result, now, {
      eventType: 'order_accepted', notifyUserId: String(order.selectedMasterId ?? ''),
      title: 'Заказ принят', body: 'Заказчик принял изделие; далее будет выполнена тестовая выплата', commandType: 'accept_delivery',
    });
    return result;
  });
}

export async function autoAcceptDueDeliveriesInFirestore(limit = 100): Promise<{ processed: number }> {
  const now = Timestamp.now();
  const snapshot = await adminDb.collection('deliveries')
    .where('status', '==', 'delivered')
    .where('acceptanceDueAt', '<=', now)
    .orderBy('acceptanceDueAt', 'asc')
    .limit(limit)
    .get();
  let processed = 0;
  for (const item of snapshot.docs) {
    const orderRef = adminDb.collection('orders').doc(item.id);
    const accepted = await adminDb.runTransaction(async (transaction) => {
      const [orderSnapshot, deliverySnapshot] = await Promise.all([transaction.get(orderRef), transaction.get(item.ref)]);
      if (!orderSnapshot.exists || !deliverySnapshot.exists) return false;
      const order = orderSnapshot.data() ?? {};
      const delivery = deliverySnapshot.data() ?? {};
      try {
        decideAutomaticAcceptance(toOrder(orderSnapshot.id, order), toDelivery(delivery), now.toMillis());
      } catch (error) {
        if (error instanceof DomainError && error.code === 'INVALID_STATE') return false;
        throw error;
      }
      const notificationRef = adminDb.collection('notifications').doc();
      const auditRef = adminDb.collection('auditEvents').doc();
      transaction.update(item.ref, { status: 'accepted', acceptedAt: now, acceptedAutomatically: true, updatedAt: now });
      transaction.update(orderRef, { status: 'accepted', deliveryStatus: 'accepted', acceptedAt: now, acceptedAutomatically: true, updatedAt: now });
      transaction.create(notificationRef, {
        userId: String(order.selectedMasterId ?? ''), type: 'order_accepted', title: 'Заказ принят автоматически',
        body: 'Пять дней после подтверждения получения прошли без открытого спора', orderId: item.id, read: false, createdAt: now, createdBy: 'system',
      });
      transaction.create(auditRef, {
        aggregateType: 'delivery', aggregateId: item.id, eventType: 'order_auto_accepted', actorId: 'system',
        commandId: `auto-accept-${now.toMillis()}-${item.id}`, payload: { acceptanceDueAt: timestampIso(delivery.acceptanceDueAt) }, createdAt: now,
      });
      return true;
    });
    if (accepted) processed += 1;
  }
  return { processed };
}

function refsFor(command: Command) {
  const order = adminDb.collection('orders').doc(command.orderId);
  return {
    order,
    delivery: adminDb.collection('deliveries').doc(command.orderId),
    receipt: order.collection('commandReceipts').doc(command.commandId),
    notification: adminDb.collection('notifications').doc(),
    audit: adminDb.collection('auditEvents').doc(),
  };
}

function writeSideEffects(transaction: FirebaseFirestore.Transaction, refs: ReturnType<typeof refsFor>, command: Command, result: DeliveryDto, now: Timestamp, meta: { eventType: string; notifyUserId: string; title: string; body: string; commandType: string }) {
  transaction.create(refs.notification, { userId: meta.notifyUserId, type: meta.eventType, title: meta.title, body: meta.body, orderId: command.orderId, read: false, createdAt: now, createdBy: 'system' });
  transaction.create(refs.audit, { aggregateType: 'delivery', aggregateId: command.orderId, eventType: meta.eventType, actorId: command.actorId, commandId: command.commandId, payload: { status: result.status, method: result.method }, createdAt: now });
  transaction.create(refs.receipt, { commandType: meta.commandType, actorId: command.actorId, result, createdAt: now });
}

function toOrder(id: string, data: DocumentData) {
  return { id, customerId: String(data.customerId ?? ''), selectedMasterId: typeof data.selectedMasterId === 'string' ? data.selectedMasterId : undefined, status: String(data.status ?? ''), disputeStatus: typeof data.disputeStatus === 'string' ? data.disputeStatus : undefined };
}
function toDelivery(data: DocumentData) {
  return { method: data.method === 'delivery' ? 'delivery' as const : 'local' as const, status: String(data.status ?? '') as DeliveryStatus, acceptanceDueAtMs: data.acceptanceDueAt instanceof Timestamp ? data.acceptanceDueAt.toMillis() : undefined };
}
function toDto(data: DocumentData): DeliveryDto {
  const result: DeliveryDto = { orderId: String(data.orderId ?? ''), method: data.method === 'delivery' ? 'delivery' : 'local', status: String(data.status ?? 'handoff_pending') as DeliveryStatus, startedAt: timestampIso(data.startedAt) };
  if (typeof data.carrier === 'string') result.carrier = data.carrier;
  if (typeof data.trackingNumber === 'string') result.trackingNumber = data.trackingNumber;
  if (data.deliveredAt) result.deliveredAt = timestampIso(data.deliveredAt);
  if (data.acceptanceDueAt) result.acceptanceDueAt = timestampIso(data.acceptanceDueAt);
  if (data.acceptedAt) result.acceptedAt = timestampIso(data.acceptedAt);
  if (typeof data.acceptedAutomatically === 'boolean') result.acceptedAutomatically = data.acceptedAutomatically;
  return result;
}
function timestampIso(value: unknown): string { return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString(); }
