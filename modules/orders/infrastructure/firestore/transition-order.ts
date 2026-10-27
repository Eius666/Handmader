import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import {
  decideOrderTransition,
  type OrderTransitionAction,
} from '../../domain/transition-order';

export interface TransitionOrderCommand {
  orderId: string;
  actorId: string;
  action: OrderTransitionAction;
  commandId: string;
}

export interface TransitionOrderResult {
  orderId: string;
  status: 'in_progress' | 'ready' | 'completed';
  repeated: boolean;
}

const NOTIFICATION_BY_ACTION = {
  start_work: {
    type: 'work_started',
    title: 'Работа началась',
    body: 'Мастер приступил к выполнению заказа',
  },
  mark_ready: {
    type: 'order_ready',
    title: 'Заказ готов',
    body: 'Мастер завершил работу над заказом',
  },
  confirm_delivery: {
    type: 'order_completed',
    title: 'Заказ завершён',
    body: 'Заказчик подтвердил получение изделия',
  },
} as const;

const TIMESTAMP_FIELD_BY_ACTION = {
  start_work: 'startedAt',
  mark_ready: 'readyAt',
  confirm_delivery: 'completedAt',
} as const;

export async function transitionOrderInFirestore(
  command: TransitionOrderCommand,
): Promise<TransitionOrderResult> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const receiptSnapshot = await transaction.get(receiptRef);
    if (receiptSnapshot.exists) {
      const stored = receiptSnapshot.data() as TransitionOrderResult;
      return { ...stored, repeated: true };
    }

    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');

    const data = orderSnapshot.data() ?? {};
    const selectedMasterId = typeof data.selectedMasterId === 'string'
      ? data.selectedMasterId
      : undefined;
    const decision = decideOrderTransition({
      id: orderSnapshot.id,
      customerId: String(data.customerId ?? ''),
      selectedMasterId,
      status: String(data.status ?? ''),
    }, command.actorId, command.action);

    const now = Timestamp.now();
    const result: TransitionOrderResult = {
      orderId: command.orderId,
      status: decision.nextStatus,
      repeated: false,
    };

    transaction.update(orderRef, {
      status: decision.nextStatus,
      [TIMESTAMP_FIELD_BY_ACTION[command.action]]: now,
      updatedAt: now,
    });

    if (command.action === 'confirm_delivery' && selectedMasterId) {
      transaction.update(adminDb.collection('users').doc(selectedMasterId), {
        'masterProfile.completedOrders': FieldValue.increment(1),
        updatedAt: now,
      });
      transaction.set(adminDb.collection('publicProfiles').doc(selectedMasterId), {
        completedOrders: FieldValue.increment(1),
        updatedAt: now,
      }, { merge: true });
    }

    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'order',
      aggregateId: command.orderId,
      eventType: command.action,
      actorId: command.actorId,
      commandId: command.commandId,
      payload: {
        previousStatus: decision.previousStatus,
        nextStatus: decision.nextStatus,
      },
      createdAt: now,
    });

    const notification = NOTIFICATION_BY_ACTION[command.action];
    transaction.create(adminDb.collection('notifications').doc(), {
      userId: decision.notifyUserId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      orderId: command.orderId,
      chatId: command.orderId,
      read: false,
      createdAt: now,
      createdBy: 'system',
    });

    transaction.create(receiptRef, {
      ...result,
      createdAt: FieldValue.serverTimestamp(),
    });

    return result;
  });
}
