import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { decideOrderCancellation } from '../../domain/cancel-order';

export interface CancelOrderCommand {
  orderId: string;
  actorId: string;
  commandId: string;
}

export interface CancelOrderResult {
  orderId: string;
  status: 'cancelled';
  repeated: boolean;
}

export async function cancelOrderInFirestore(
  command: CancelOrderCommand,
): Promise<CancelOrderResult> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const [receiptSnapshot, orderSnapshot] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(orderRef),
    ]);
    if (receiptSnapshot.exists) {
      const stored = receiptSnapshot.data()?.result as CancelOrderResult | undefined;
      if (!stored) throw new DomainError('INVALID_STATE', 'Повтор команды не содержит результат');
      return { ...stored, repeated: true };
    }
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');

    const data = orderSnapshot.data() ?? {};
    const decision = decideOrderCancellation({
      id: orderSnapshot.id,
      customerId: String(data.customerId ?? ''),
      status: String(data.status ?? ''),
    }, command.actorId);
    const now = Timestamp.now();
    const result: CancelOrderResult = {
      orderId: command.orderId,
      status: decision.nextStatus,
      repeated: false,
    };

    transaction.update(orderRef, {
      status: decision.nextStatus,
      cancelledAt: now,
      cancelledBy: command.actorId,
      updatedAt: now,
    });
    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'order',
      aggregateId: command.orderId,
      eventType: 'order_cancelled',
      actorId: command.actorId,
      commandId: command.commandId,
      payload: {
        previousStatus: decision.previousStatus,
        nextStatus: decision.nextStatus,
      },
      createdAt: now,
    });
    transaction.create(adminDb.collection('outboxEvents').doc(), {
      type: 'order.cancelled',
      aggregateId: command.orderId,
      payload: { customerId: command.actorId },
      availableAt: now,
      status: 'pending',
      attempts: 0,
      createdAt: now,
    });
    transaction.create(receiptRef, {
      commandType: 'cancel_order',
      actorId: command.actorId,
      result,
      createdAt: now,
    });

    return result;
  });
}
