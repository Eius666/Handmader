import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type { StaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { createPublicAlias } from '@/modules/users/domain/public-alias';
import {
  decideReselectionRequest,
  decideSelectionReopen,
  type ReselectionOrderSnapshot,
} from '../../domain/reselection';

const RECONFIRMATION_WINDOW_MS = 48 * 60 * 60 * 1_000;

export interface RequestReselectionCommand {
  orderId: string;
  actorId: string;
  reason: unknown;
  commandId: string;
}

export interface RequestReselectionResult {
  caseId: string;
  orderId: string;
  status: 'pending';
  repeated: boolean;
}

export interface ReselectionCaseDto {
  id: string;
  orderId: string;
  orderTitle: string;
  orderStatus: string;
  customerAlias: string;
  previousMasterAlias: string;
  reason: string;
  requestedAt: string;
}

export interface ReopenSelectionCommand {
  caseId: string;
  staff: StaffActor;
  commandId: string;
}

export interface ReopenSelectionResult {
  caseId: string;
  orderId: string;
  status: 'awaiting_responses';
  reconfirmationDeadline: string;
  repeated: boolean;
}

export async function requestReselectionInFirestore(
  command: RequestReselectionCommand,
): Promise<RequestReselectionResult> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const caseRef = adminDb.collection('reselectionCases').doc(command.commandId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const [receiptSnapshot, orderSnapshot] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(orderRef),
    ]);
    if (receiptSnapshot.exists) {
      return { ...(receiptSnapshot.data()?.result as RequestReselectionResult), repeated: true };
    }
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');

    const order = orderSnapshot.data() ?? {};
    const decision = decideReselectionRequest(orderSnapshotForDomain(
      orderSnapshot.id,
      order,
    ), command.actorId, command.reason);
    const now = Timestamp.now();
    const result: RequestReselectionResult = {
      caseId: caseRef.id,
      orderId: command.orderId,
      status: 'pending',
      repeated: false,
    };

    transaction.create(caseRef, {
      orderId: command.orderId,
      customerId: command.actorId,
      previousMasterId: decision.previousMasterId,
      reason: decision.reason,
      status: 'pending',
      requestedAt: now,
      updatedAt: now,
    });
    transaction.update(orderRef, {
      reselectionRequestStatus: 'pending',
      reselectionCaseId: caseRef.id,
      updatedAt: now,
    });
    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'order',
      aggregateId: command.orderId,
      eventType: 'reselection_requested',
      actorId: command.actorId,
      commandId: command.commandId,
      payload: {
        caseId: caseRef.id,
        previousMasterId: decision.previousMasterId,
        reason: decision.reason,
      },
      createdAt: now,
    });
    transaction.create(adminDb.collection('outboxEvents').doc(), {
      type: 'order.reselection_requested',
      aggregateId: command.orderId,
      payload: { caseId: caseRef.id, orderId: command.orderId },
      status: 'pending',
      attempts: 0,
      availableAt: now,
      createdAt: now,
    });
    transaction.create(receiptRef, {
      commandType: 'request_reselection',
      actorId: command.actorId,
      result,
      createdAt: now,
    });
    return result;
  });
}

export async function listPendingReselectionCasesFromFirestore(): Promise<ReselectionCaseDto[]> {
  const snapshot = await adminDb.collection('reselectionCases')
    .where('status', '==', 'pending')
    .limit(100)
    .get();
  const rows = await Promise.all(snapshot.docs.map(async (caseSnapshot) => {
    const data = caseSnapshot.data();
    const orderId = String(data.orderId ?? '');
    const orderSnapshot = orderId
      ? await adminDb.collection('orders').doc(orderId).get()
      : null;
    const order = orderSnapshot?.data() ?? {};
    return {
      id: caseSnapshot.id,
      orderId,
      orderTitle: String(order.title ?? order.description ?? 'Заказ'),
      orderStatus: String(order.status ?? ''),
      customerAlias: createPublicAlias('customer', String(data.customerId ?? '')),
      previousMasterAlias: createPublicAlias('master', String(data.previousMasterId ?? '')),
      reason: String(data.reason ?? ''),
      requestedAt: timestampIso(data.requestedAt),
    } satisfies ReselectionCaseDto;
  }));
  return rows.sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));
}

export async function reopenSelectionInFirestore(
  command: ReopenSelectionCommand,
): Promise<ReopenSelectionResult> {
  const caseRef = adminDb.collection('reselectionCases').doc(command.caseId);
  const receiptRef = caseRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const receiptSnapshot = await transaction.get(receiptRef);
    if (receiptSnapshot.exists) {
      return { ...(receiptSnapshot.data()?.result as ReopenSelectionResult), repeated: true };
    }
    const caseSnapshot = await transaction.get(caseRef);
    if (!caseSnapshot.exists) throw new DomainError('NOT_FOUND', 'Обращение не найдено');
    const supportCase = caseSnapshot.data() ?? {};
    const orderId = String(supportCase.orderId ?? '');
    const orderRef = adminDb.collection('orders').doc(orderId);
    const chatRef = adminDb.collection('chats').doc(orderId);
    const agreementRef = adminDb.collection('agreements').doc(orderId);
    const [orderSnapshot, proposalsSnapshot, chatSnapshot, agreementSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(orderRef.collection('proposals')),
      transaction.get(chatRef),
      transaction.get(agreementRef),
    ]);
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
    const order = orderSnapshot.data() ?? {};
    const decision = decideSelectionReopen(
      orderSnapshotForDomain(orderSnapshot.id, order),
      {
        id: caseSnapshot.id,
        orderId,
        customerId: String(supportCase.customerId ?? ''),
        previousMasterId: String(supportCase.previousMasterId ?? ''),
        status: String(supportCase.status ?? ''),
        reason: String(supportCase.reason ?? ''),
      },
    );
    const now = Timestamp.now();
    const deadline = Timestamp.fromDate(new Date(now.toMillis() + RECONFIRMATION_WINDOW_MS));
    const excludedMasterIds = Array.from(new Set([
      ...stringArray(order.excludedMasterIds),
      decision.previousMasterId,
    ]));
    const result: ReopenSelectionResult = {
      caseId: command.caseId,
      orderId,
      status: decision.nextStatus,
      reconfirmationDeadline: deadline.toDate().toISOString(),
      repeated: false,
    };

    transaction.update(orderRef, {
      status: decision.nextStatus,
      reselectionCycle: decision.nextCycle,
      reconfirmationDeadline: deadline,
      excludedMasterIds,
      reselectionRequestStatus: 'resolved',
      reselectionResolvedAt: now,
      reselectionResolvedBy: command.staff.uid,
      selectedMasterId: FieldValue.delete(),
      selectedMasterName: FieldValue.delete(),
      selectedPrice: FieldValue.delete(),
      selectedAt: FieldValue.delete(),
      agreementStatus: FieldValue.delete(),
      agreementVersion: FieldValue.delete(),
      finalPrice: FieldValue.delete(),
      updatedAt: now,
    });
    transaction.update(caseRef, {
      status: 'reopened',
      resolvedAt: now,
      resolvedBy: command.staff.uid,
      resolvedByRole: command.staff.role,
      reconfirmationDeadline: deadline,
      updatedAt: now,
    });
    if (chatSnapshot.exists) {
      transaction.update(chatRef, { status: 'closed', closedAt: now, closedReason: 'reselection' });
    }
    if (agreementSnapshot.exists) {
      transaction.update(agreementRef, {
        status: 'superseded',
        supersededAt: now,
        supersededBy: command.staff.uid,
        supersededReason: 'reselection',
      });
    }

    const customerId = String(order.customerId ?? '');
    createNotification(transaction, {
      userId: customerId,
      type: 'order_reopened',
      title: 'Повторный выбор мастера открыт',
      body: 'Мастера должны подтвердить актуальность откликов в течение 48 часов',
      orderId,
      now,
    });
    createNotification(transaction, {
      userId: decision.previousMasterId,
      type: 'master_reselection_closed',
      title: 'Выбор исполнителя открыт повторно',
      body: `Вы исключены из повторного выбора по заказу №${orderId}`,
      orderId,
      now,
    });
    for (const proposal of proposalsSnapshot.docs) {
      if (proposal.id === decision.previousMasterId) continue;
      createNotification(transaction, {
        userId: proposal.id,
        type: 'proposal_reconfirmation_required',
        title: 'Подтвердите актуальность отклика',
        body: 'Цена и срок должны быть подтверждены в течение 48 часов',
        orderId,
        now,
      });
    }
    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'order',
      aggregateId: orderId,
      eventType: 'selection_reopened',
      actorId: command.staff.uid,
      actorRole: command.staff.role,
      commandId: command.commandId,
      payload: {
        caseId: command.caseId,
        previousMasterId: decision.previousMasterId,
        reason: String(supportCase.reason ?? ''),
        reselectionCycle: decision.nextCycle,
        reconfirmationDeadline: deadline.toDate().toISOString(),
      },
      createdAt: now,
    });
    transaction.create(adminDb.collection('outboxEvents').doc(), {
      type: 'order.selection_reopened',
      aggregateId: orderId,
      payload: { caseId: command.caseId, orderId, reselectionCycle: decision.nextCycle },
      status: 'pending',
      attempts: 0,
      availableAt: now,
      createdAt: now,
    });
    transaction.create(receiptRef, {
      commandType: 'reopen_selection',
      actorId: command.staff.uid,
      result,
      createdAt: now,
    });
    return result;
  });
}

function orderSnapshotForDomain(
  id: string,
  data: Record<string, unknown>,
): ReselectionOrderSnapshot {
  return {
    id,
    customerId: String(data.customerId ?? ''),
    status: String(data.status ?? ''),
    selectedMasterId: typeof data.selectedMasterId === 'string'
      ? data.selectedMasterId
      : undefined,
    paymentConfirmed: data.paymentStatus === 'funded' || data.paymentStatus === 'paid',
    reselectionRequestStatus: typeof data.reselectionRequestStatus === 'string'
      ? data.reselectionRequestStatus
      : undefined,
    reselectionCycle: typeof data.reselectionCycle === 'number' ? data.reselectionCycle : 0,
  };
}

function createNotification(
  transaction: FirebaseFirestore.Transaction,
  input: { userId: string; type: string; title: string; body: string; orderId: string; now: Timestamp },
): void {
  if (!input.userId) return;
  transaction.create(adminDb.collection('notifications').doc(), {
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    orderId: input.orderId,
    read: false,
    createdAt: input.now,
    createdBy: 'system',
  });
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function timestampIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}
