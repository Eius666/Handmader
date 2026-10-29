import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { decideMessageSending } from '../../domain/send-message';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { createPublicAlias } from '@/modules/users/domain/public-alias';

export interface SendMessageCommand {
  orderId: string;
  actorId: string;
  text: string;
  commandId: string;
}

export interface SendMessageResult {
  messageId: string;
  createdAt: string;
  repeated: boolean;
}

export async function sendMessageInFirestore(
  command: SendMessageCommand,
): Promise<SendMessageResult> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const chatRef = adminDb.collection('chats').doc(command.orderId);
  const messageRef = chatRef.collection('messages').doc(command.commandId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const receiptSnapshot = await transaction.get(receiptRef);
    if (receiptSnapshot.exists) {
      return { ...(receiptSnapshot.data()?.result as SendMessageResult), repeated: true };
    }

    const orderSnapshot = await transaction.get(orderRef);
    const chatSnapshot = await transaction.get(chatRef);
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');

    const order = orderSnapshot.data() ?? {};
    const selectedMasterId = typeof order.selectedMasterId === 'string'
      ? order.selectedMasterId
      : undefined;
    const decision = decideMessageSending({
      id: command.orderId,
      customerId: String(order.customerId ?? ''),
      selectedMasterId,
      paymentConfirmed: order.paymentStatus === 'funded' || order.paymentStatus === 'paid',
    }, command.actorId, command.text);

    const now = Timestamp.now();
    const senderAlias = createPublicAlias(decision.senderRole, command.actorId);
    const customerAlias = createPublicAlias('customer', String(order.customerId ?? ''));
    const masterAlias = createPublicAlias('master', selectedMasterId ?? '');
    const unreadField = decision.senderRole === 'customer' ? 'unreadMaster' : 'unreadCustomer';
    const chatCycle = typeof order.reselectionCycle === 'number' ? order.reselectionCycle : 0;

    if (chatSnapshot.exists) {
      transaction.update(chatRef, {
        lastMessage: decision.text.slice(0, 100),
        lastMessageAt: now,
        status: 'active',
        cycle: chatCycle,
        [unreadField]: FieldValue.increment(1),
      });
    } else {
      transaction.create(chatRef, {
        orderId: command.orderId,
        customerId: String(order.customerId),
        masterId: selectedMasterId,
        customerName: customerAlias,
        masterName: masterAlias,
        lastMessage: decision.text.slice(0, 100),
        lastMessageAt: now,
        unreadCustomer: decision.senderRole === 'master' ? 1 : 0,
        unreadMaster: decision.senderRole === 'customer' ? 1 : 0,
        createdAt: now,
        status: 'active',
        cycle: chatCycle,
      });
    }

    transaction.create(messageRef, {
      senderId: command.actorId,
      senderName: senderAlias,
      text: decision.text,
      createdAt: now,
      read: false,
      chatCycle,
    });

    transaction.create(adminDb.collection('notifications').doc(), {
      userId: decision.recipientId,
      type: 'new_message',
      title: `Новое сообщение от ${senderAlias}`,
      body: decision.text.slice(0, 100),
      orderId: command.orderId,
      chatId: command.orderId,
      read: false,
      createdAt: now,
      createdBy: 'system',
    });

    const result: SendMessageResult = {
      messageId: messageRef.id,
      createdAt: now.toDate().toISOString(),
      repeated: false,
    };
    transaction.create(receiptRef, {
      commandType: 'send_message',
      result,
      createdAt: FieldValue.serverTimestamp(),
    });

    return result;
  });
}
