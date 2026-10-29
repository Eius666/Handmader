import 'server-only';

import { Timestamp, type DocumentData } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import {
  decideMaterialAdvanceAuthorization,
  decideMaterialAdvanceRequest,
  decideMaterialExpenseEvidence,
  type MaterialAdvanceStatus,
} from '../../domain/material-advance';

export interface MaterialAdvanceDto {
  orderId: string;
  status: MaterialAdvanceStatus;
  currency: 'RUB';
  requestedAmountMinor: number;
  maximumAmountMinor: number;
  requestedAt: string;
  authorizedAt?: string;
  evidence?: {
    spentAmountMinor: number;
    unusedAmountMinor: number;
    note: string;
    submittedAt: string;
  };
}

interface MaterialAdvanceCommand {
  orderId: string;
  actorId: string;
  commandId: string;
}

export async function getMaterialAdvanceFromFirestore(
  orderId: string,
  actorId: string,
): Promise<MaterialAdvanceDto | null> {
  const orderRef = adminDb.collection('orders').doc(orderId);
  const advanceRef = adminDb.collection('materialAdvances').doc(orderId);
  const [orderSnapshot, advanceSnapshot] = await Promise.all([orderRef.get(), advanceRef.get()]);
  if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
  const order = orderSnapshot.data() ?? {};
  if (actorId !== order.customerId && actorId !== order.selectedMasterId) {
    throw new DomainError('FORBIDDEN', 'Аванс доступен только участникам заказа');
  }
  return advanceSnapshot.exists ? toDto(advanceSnapshot.data() ?? {}) : null;
}

export async function requestMaterialAdvanceInFirestore(
  command: MaterialAdvanceCommand & { requestedAmountMinor: unknown },
): Promise<MaterialAdvanceDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const advanceRef = adminDb.collection('materialAdvances').doc(command.orderId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);
  const notificationRef = adminDb.collection('notifications').doc();
  const auditRef = adminDb.collection('auditEvents').doc();

  return adminDb.runTransaction(async (transaction) => {
    const [receipt, orderSnapshot, advanceSnapshot] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(orderRef),
      transaction.get(advanceRef),
    ]);
    if (receipt.exists) return receipt.data()?.result as MaterialAdvanceDto;
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
    if (advanceSnapshot.exists) throw new DomainError('INVALID_STATE', 'Аванс по этому заказу уже запрошен');

    const order = orderSnapshot.data() ?? {};
    const decision = decideMaterialAdvanceRequest(orderSnapshotToDomain(orderSnapshot.id, order), command.actorId, command.requestedAmountMinor);
    const now = Timestamp.now();
    const data = {
      orderId: command.orderId,
      customerId: String(order.customerId ?? ''),
      masterId: String(order.selectedMasterId ?? ''),
      status: 'requested' as const,
      currency: 'RUB' as const,
      requestedAmountMinor: decision.requestedAmountMinor,
      maximumAmountMinor: decision.maximumAmountMinor,
      requestedBy: command.actorId,
      requestedAt: now,
      updatedAt: now,
      testMode: true,
    };
    const result = toDto(data);

    transaction.create(advanceRef, data);
    transaction.update(orderRef, { materialAdvanceStatus: 'requested', updatedAt: now });
    transaction.create(notificationRef, {
      userId: data.customerId,
      type: 'material_advance_requested',
      title: 'Мастер запросил аванс на материалы',
      body: `Подтвердите тестовый аванс ${formatRubles(data.requestedAmountMinor)}`,
      orderId: command.orderId,
      read: false,
      createdAt: now,
      createdBy: 'system',
    });
    transaction.create(auditRef, auditEvent(command, 'material_advance_requested', {
      requestedAmountMinor: data.requestedAmountMinor,
      maximumAmountMinor: data.maximumAmountMinor,
    }, now));
    transaction.create(receiptRef, commandReceipt('request_material_advance', command.actorId, result, now));
    return result;
  });
}

export async function authorizeMaterialAdvanceInFirestore(
  command: MaterialAdvanceCommand,
): Promise<MaterialAdvanceDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const advanceRef = adminDb.collection('materialAdvances').doc(command.orderId);
  const paymentRef = adminDb.collection('payments').doc(command.orderId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);
  const notificationRef = adminDb.collection('notifications').doc();
  const auditRef = adminDb.collection('auditEvents').doc();
  const paymentEventRef = paymentRef.collection('events').doc();

  return adminDb.runTransaction(async (transaction) => {
    const [receipt, orderSnapshot, advanceSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(orderRef),
      transaction.get(advanceRef),
      transaction.get(paymentRef),
    ]);
    if (receipt.exists) return receipt.data()?.result as MaterialAdvanceDto;
    if (!orderSnapshot.exists || !advanceSnapshot.exists || !paymentSnapshot.exists) {
      throw new DomainError('NOT_FOUND', 'Запрос аванса или тестовый платёж не найден');
    }

    const order = orderSnapshot.data() ?? {};
    const advance = advanceSnapshot.data() ?? {};
    const decision = decideMaterialAdvanceAuthorization(
      orderSnapshotToDomain(orderSnapshot.id, order),
      {
        status: String(advance.status ?? '') as MaterialAdvanceStatus,
        requestedAmountMinor: Number(advance.requestedAmountMinor),
      },
      command.actorId,
    );
    const now = Timestamp.now();
    const updated = { ...advance, status: decision.status, authorizedBy: command.actorId, authorizedAt: now, updatedAt: now };
    const result = toDto(updated);

    transaction.update(advanceRef, {
      status: decision.status,
      authorizedBy: command.actorId,
      authorizedAt: now,
      updatedAt: now,
    });
    transaction.update(orderRef, { materialAdvanceStatus: decision.status, updatedAt: now });
    transaction.create(paymentEventRef, {
      type: 'material_advance_authorized',
      amountMinor: Number(advance.requestedAmountMinor),
      provider: 'mock',
      testMode: true,
      commandId: command.commandId,
      createdAt: now,
    });
    transaction.create(notificationRef, {
      userId: String(order.selectedMasterId ?? ''),
      type: 'material_advance_authorized',
      title: 'Аванс на материалы подтверждён',
      body: 'Заказчик разрешил тестовый аванс; реальные деньги не переводились',
      orderId: command.orderId,
      read: false,
      createdAt: now,
      createdBy: 'system',
    });
    transaction.create(auditRef, auditEvent(command, 'material_advance_authorized', {
      requestedAmountMinor: Number(advance.requestedAmountMinor),
      testMode: true,
    }, now));
    transaction.create(receiptRef, commandReceipt('authorize_material_advance', command.actorId, result, now));
    return result;
  });
}

export async function submitMaterialExpenseEvidenceInFirestore(
  command: MaterialAdvanceCommand & { spentAmountMinor: unknown; note: unknown },
): Promise<MaterialAdvanceDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const advanceRef = adminDb.collection('materialAdvances').doc(command.orderId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);
  const notificationRef = adminDb.collection('notifications').doc();
  const auditRef = adminDb.collection('auditEvents').doc();

  return adminDb.runTransaction(async (transaction) => {
    const [receipt, orderSnapshot, advanceSnapshot] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(orderRef),
      transaction.get(advanceRef),
    ]);
    if (receipt.exists) return receipt.data()?.result as MaterialAdvanceDto;
    if (!orderSnapshot.exists || !advanceSnapshot.exists) {
      throw new DomainError('NOT_FOUND', 'Запрос аванса не найден');
    }

    const order = orderSnapshot.data() ?? {};
    const advance = advanceSnapshot.data() ?? {};
    const decision = decideMaterialExpenseEvidence(
      orderSnapshotToDomain(orderSnapshot.id, order),
      {
        status: String(advance.status ?? '') as MaterialAdvanceStatus,
        requestedAmountMinor: Number(advance.requestedAmountMinor),
      },
      command.actorId,
      { spentAmountMinor: command.spentAmountMinor, note: command.note },
    );
    const now = Timestamp.now();
    const evidence = {
      spentAmountMinor: decision.spentAmountMinor,
      unusedAmountMinor: decision.unusedAmountMinor,
      note: decision.note,
      submittedBy: command.actorId,
      submittedAt: now,
    };
    const updated = { ...advance, status: decision.status, evidence, updatedAt: now };
    const result = toDto(updated);

    transaction.update(advanceRef, { status: decision.status, evidence, updatedAt: now });
    transaction.update(orderRef, { materialAdvanceStatus: decision.status, updatedAt: now });
    transaction.create(notificationRef, {
      userId: String(order.customerId ?? ''),
      type: 'material_expense_evidence_submitted',
      title: 'Мастер зафиксировал расходы на материалы',
      body: `Расходы: ${formatRubles(decision.spentAmountMinor)}, остаток: ${formatRubles(decision.unusedAmountMinor)}`,
      orderId: command.orderId,
      read: false,
      createdAt: now,
      createdBy: 'system',
    });
    transaction.create(auditRef, auditEvent(command, 'material_expense_evidence_submitted', {
      spentAmountMinor: decision.spentAmountMinor,
      unusedAmountMinor: decision.unusedAmountMinor,
    }, now));
    transaction.create(receiptRef, commandReceipt('submit_material_expense_evidence', command.actorId, result, now));
    return result;
  });
}

function orderSnapshotToDomain(id: string, data: DocumentData) {
  return {
    id,
    customerId: String(data.customerId ?? ''),
    selectedMasterId: typeof data.selectedMasterId === 'string' ? data.selectedMasterId : undefined,
    status: String(data.status ?? ''),
    paymentStatus: typeof data.paymentStatus === 'string' ? data.paymentStatus : undefined,
    finalPrice: typeof data.finalPrice === 'number' ? data.finalPrice : undefined,
  };
}

function toDto(data: DocumentData): MaterialAdvanceDto {
  const result: MaterialAdvanceDto = {
    orderId: String(data.orderId ?? ''),
    status: String(data.status ?? 'requested') as MaterialAdvanceStatus,
    currency: 'RUB',
    requestedAmountMinor: Number(data.requestedAmountMinor ?? 0),
    maximumAmountMinor: Number(data.maximumAmountMinor ?? 0),
    requestedAt: timestampToIso(data.requestedAt),
  };
  if (data.authorizedAt) result.authorizedAt = timestampToIso(data.authorizedAt);
  if (data.evidence) {
    result.evidence = {
      spentAmountMinor: Number(data.evidence.spentAmountMinor ?? 0),
      unusedAmountMinor: Number(data.evidence.unusedAmountMinor ?? 0),
      note: String(data.evidence.note ?? ''),
      submittedAt: timestampToIso(data.evidence.submittedAt),
    };
  }
  return result;
}

function timestampToIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}

function auditEvent(command: MaterialAdvanceCommand, eventType: string, payload: Record<string, unknown>, now: Timestamp) {
  return {
    aggregateType: 'material_advance',
    aggregateId: command.orderId,
    eventType,
    actorId: command.actorId,
    commandId: command.commandId,
    payload,
    createdAt: now,
  };
}

function commandReceipt(commandType: string, actorId: string, result: MaterialAdvanceDto, now: Timestamp) {
  return { commandType, actorId, result, createdAt: now };
}

function formatRubles(amountMinor: number): string {
  return `${(amountMinor / 100).toLocaleString('ru-RU')} ₽`;
}
