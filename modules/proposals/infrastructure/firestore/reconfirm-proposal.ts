import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { decideProposalReconfirmation } from '../../domain/reconfirm-proposal';

export interface ReconfirmProposalCommand {
  orderId: string;
  actorId: string;
  commandId: string;
}

export interface ReconfirmProposalResult {
  orderId: string;
  masterId: string;
  status: 'active';
  validUntil: string;
  repeated: boolean;
}

export async function reconfirmProposalInFirestore(
  command: ReconfirmProposalCommand,
): Promise<ReconfirmProposalResult> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const proposalRef = orderRef.collection('proposals').doc(command.actorId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const [receiptSnapshot, orderSnapshot, proposalSnapshot] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(orderRef),
      transaction.get(proposalRef),
    ]);
    if (receiptSnapshot.exists) {
      return { ...(receiptSnapshot.data()?.result as ReconfirmProposalResult), repeated: true };
    }
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
    if (!proposalSnapshot.exists) throw new DomainError('NOT_FOUND', 'Отклик не найден');
    const order = orderSnapshot.data() ?? {};
    const proposal = proposalSnapshot.data() ?? {};
    const nowDate = new Date();
    const decision = decideProposalReconfirmation({
      status: String(order.status ?? ''),
      reselectionCycle: typeof order.reselectionCycle === 'number' ? order.reselectionCycle : 0,
      reconfirmationDeadline: order.reconfirmationDeadline instanceof Timestamp
        ? order.reconfirmationDeadline.toDate()
        : undefined,
      excludedMasterIds: stringArray(order.excludedMasterIds),
    }, {
      masterId: String(proposal.masterId ?? proposalSnapshot.id),
      confirmedReselectionCycle: typeof proposal.confirmedReselectionCycle === 'number'
        ? proposal.confirmedReselectionCycle
        : 0,
    }, command.actorId, nowDate);
    const now = Timestamp.fromDate(nowDate);
    const validUntil = Timestamp.fromDate(decision.validUntil);
    const result: ReconfirmProposalResult = {
      orderId: command.orderId,
      masterId: command.actorId,
      status: decision.status,
      validUntil: decision.validUntil.toISOString(),
      repeated: false,
    };

    transaction.update(proposalRef, {
      status: decision.status,
      confirmedReselectionCycle: decision.confirmedReselectionCycle,
      reconfirmedAt: now,
      validUntil,
      updatedAt: now,
    });
    transaction.create(adminDb.collection('notifications').doc(), {
      userId: String(order.customerId ?? ''),
      type: 'proposal_reconfirmed',
      title: 'Отклик снова актуален',
      body: 'Мастер подтвердил цену и срок своего предложения',
      orderId: command.orderId,
      read: false,
      createdAt: now,
      createdBy: 'system',
    });
    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'proposal',
      aggregateId: `${command.orderId}:${command.actorId}`,
      eventType: 'proposal_reconfirmed',
      actorId: command.actorId,
      commandId: command.commandId,
      payload: { reselectionCycle: decision.confirmedReselectionCycle },
      createdAt: now,
    });
    transaction.create(receiptRef, {
      commandType: 'reconfirm_proposal',
      actorId: command.actorId,
      result,
      createdAt: FieldValue.serverTimestamp(),
    });
    return result;
  });
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
