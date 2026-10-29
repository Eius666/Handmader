import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { createPublicAlias } from '@/modules/users/domain/public-alias';
import { decideMasterSelection, type ProposalSnapshot } from '../../domain/select-master';

export interface SelectMasterCommand {
  orderId: string;
  actorId: string;
  masterId: string;
  commandId: string;
}

export interface SelectMasterResult {
  orderId: string;
  selectedMasterId: string;
  selectedMasterAlias: string;
  selectedPrice: number;
  status: 'master_selected';
  repeated: boolean;
}

interface StoredResponse {
  masterId?: unknown;
  masterAlias?: unknown;
  price?: unknown;
  validUntil?: unknown;
  status?: unknown;
  confirmedReselectionCycle?: unknown;
}

function proposalFromStored(masterId: string, value: StoredResponse): ProposalSnapshot {
  return {
    masterId: typeof value.masterId === 'string' ? value.masterId : masterId,
    masterAlias: typeof value.masterAlias === 'string'
      ? value.masterAlias
      : createPublicAlias('master', masterId),
    price: typeof value.price === 'number' ? value.price : Number.NaN,
    validUntil: value.validUntil instanceof Timestamp
      ? value.validUntil.toDate()
      : undefined,
    status: typeof value.status === 'string' ? value.status : undefined,
    confirmedReselectionCycle: typeof value.confirmedReselectionCycle === 'number'
      ? value.confirmedReselectionCycle
      : 0,
  };
}

export async function selectMasterInFirestore(
  command: SelectMasterCommand,
): Promise<SelectMasterResult> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const proposalRef = orderRef.collection('proposals').doc(command.masterId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const receiptSnapshot = await transaction.get(receiptRef);
    if (receiptSnapshot.exists) {
      const stored = receiptSnapshot.data() as SelectMasterResult;
      return { ...stored, repeated: true };
    }

    const orderSnapshot = await transaction.get(orderRef);
    const proposalSnapshot = await transaction.get(proposalRef);
    if (!orderSnapshot.exists) {
      throw new DomainError('NOT_FOUND', 'Заказ не найден');
    }

    const data = orderSnapshot.data() ?? {};
    const storedResponses = (data.responses ?? {}) as Record<string, StoredResponse>;
    const selectedStored = proposalSnapshot.exists
      ? proposalSnapshot.data() as StoredResponse
      : storedResponses[command.masterId];
    const proposals = selectedStored
      ? { [command.masterId]: proposalFromStored(command.masterId, selectedStored) }
      : {};

    const decision = decideMasterSelection({
      id: orderSnapshot.id,
      customerId: String(data.customerId ?? ''),
      status: String(data.status ?? ''),
      selectedMasterId: typeof data.selectedMasterId === 'string' ? data.selectedMasterId : undefined,
      reselectionCycle: typeof data.reselectionCycle === 'number' ? data.reselectionCycle : 0,
      excludedMasterIds: Array.isArray(data.excludedMasterIds)
        ? data.excludedMasterIds.filter((item): item is string => typeof item === 'string')
        : [],
      proposals,
    }, command.actorId, command.masterId);

    const now = Timestamp.now();
    const result: SelectMasterResult = {
      orderId: command.orderId,
      selectedMasterId: decision.selectedMasterId,
      selectedMasterAlias: decision.selectedMasterAlias,
      selectedPrice: decision.selectedPrice,
      status: decision.nextStatus,
      repeated: false,
    };

    transaction.update(orderRef, {
      status: decision.nextStatus,
      selectedMasterId: decision.selectedMasterId,
      selectedMasterName: decision.selectedMasterAlias,
      selectedPrice: decision.selectedPrice,
      selectedAt: now,
      updatedAt: now,
      reselectionRequestStatus: FieldValue.delete(),
      reconfirmationDeadline: FieldValue.delete(),
    });

    const chatRef = adminDb.collection('chats').doc(command.orderId);
    transaction.set(chatRef, {
      orderId: command.orderId,
      customerId: String(data.customerId),
      masterId: decision.selectedMasterId,
      customerName: createPublicAlias('customer', String(data.customerId)),
      masterName: decision.selectedMasterAlias,
      lastMessage: '',
      lastMessageAt: now,
      unreadCustomer: 0,
      unreadMaster: 0,
      createdAt: now,
      status: 'active',
      cycle: typeof data.reselectionCycle === 'number' ? data.reselectionCycle : 0,
    });

    const auditRef = adminDb.collection('auditEvents').doc();
    transaction.create(auditRef, {
      aggregateType: 'order',
      aggregateId: command.orderId,
      eventType: 'master_selected',
      actorId: command.actorId,
      commandId: command.commandId,
      payload: {
        masterId: decision.selectedMasterId,
        selectedPrice: decision.selectedPrice,
      },
      createdAt: now,
    });

    const notificationRef = adminDb.collection('notifications').doc();
    transaction.create(notificationRef, {
      userId: decision.selectedMasterId,
      type: 'master_selected',
      title: 'Вас выбрали исполнителем',
      body: `Заказ №${command.orderId}`,
      orderId: command.orderId,
      chatId: command.orderId,
      read: false,
      createdAt: now,
      createdBy: 'system',
    });

    transaction.create(receiptRef, {
      ...result,
      repeated: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    return result;
  });
}
