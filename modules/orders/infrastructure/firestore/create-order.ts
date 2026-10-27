import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { createPublicAlias } from '@/modules/users/domain/public-alias';
import { decideOrderCreation, type CreateOrderInput } from '../../domain/create-order';

export interface CreateOrderCommand {
  actorId: string;
  commandId: string;
  input: CreateOrderInput;
}

export interface CreateOrderResult {
  orderId: string;
  status: 'awaiting_responses';
  repeated: boolean;
}

export async function createOrderInFirestore(
  command: CreateOrderCommand,
): Promise<CreateOrderResult> {
  const userRef = adminDb.collection('users').doc(command.actorId);
  const receiptRef = adminDb.collection('commandReceipts')
    .doc(`create-order_${command.actorId}_${command.commandId}`);
  const orderRef = adminDb.collection('orders').doc();

  return adminDb.runTransaction(async (transaction) => {
    const receipt = await transaction.get(receiptRef);
    if (receipt.exists) {
      return { ...(receipt.data()?.result as CreateOrderResult), repeated: true };
    }

    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) throw new DomainError('FORBIDDEN', 'Профиль пользователя не найден');
    const user = userSnapshot.data() ?? {};
    const data = decideOrderCreation(
      { id: command.actorId, role: user.role },
      command.input,
    );
    const now = Timestamp.now();
    const result: CreateOrderResult = {
      orderId: orderRef.id,
      status: 'awaiting_responses',
      repeated: false,
    };

    transaction.create(orderRef, {
      ...data,
      customerId: command.actorId,
      customerName: createPublicAlias('customer', command.actorId),
      status: 'awaiting_responses',
      responseCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'order',
      aggregateId: orderRef.id,
      eventType: 'order_created',
      actorId: command.actorId,
      commandId: command.commandId,
      createdAt: now,
    });
    transaction.create(adminDb.collection('outboxEvents').doc(), {
      type: 'order.created',
      aggregateId: orderRef.id,
      payload: { category: data.category },
      status: 'pending',
      attempts: 0,
      createdAt: now,
    });
    transaction.create(receiptRef, {
      commandType: 'create_order',
      actorId: command.actorId,
      result,
      createdAt: now,
    });
    return result;
  });
}
