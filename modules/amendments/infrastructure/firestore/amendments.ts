import 'server-only';

import { Timestamp, type DocumentData, type Transaction } from 'firebase-admin/firestore';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { decideAmendmentConfirmation, decideAmendmentProposal, type AmendmentConfirmations, type AmendmentInput } from '../../domain/amendment';

export interface AmendmentDto {
  orderId: string;
  version: number;
  baseAgreementVersion: number;
  targetAgreementVersion: number;
  status: 'pending' | 'confirmed';
  description: string;
  measurements: string;
  deadline: string;
  tolerances?: string;
  finalPrice: number;
  reason: string;
  confirmations: AmendmentConfirmations;
  proposedBy: string;
  updatedAt: string;
  confirmedAt?: string;
}

export async function getAmendmentForActorFromFirestore(orderId: string, actorId: string): Promise<AmendmentDto | null> {
  const [orderSnapshot, amendmentSnapshot] = await Promise.all([
    adminDb.collection('orders').doc(orderId).get(),
    adminDb.collection('orderAmendments').doc(orderId).get(),
  ]);
  if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
  requireParticipant(orderSnapshot.data() ?? {}, actorId);
  return amendmentSnapshot.exists ? amendmentDto(amendmentSnapshot.data() ?? {}) : null;
}

export async function changeAmendmentInFirestore(command: {
  orderId: string;
  actorId: string;
  commandId: string;
  action: 'propose' | 'confirm';
  input?: AmendmentInput;
}): Promise<AmendmentDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const agreementRef = adminDb.collection('agreements').doc(command.orderId);
  const amendmentRef = adminDb.collection('orderAmendments').doc(command.orderId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);
  return adminDb.runTransaction(async (transaction) => {
    const [receipt, orderSnapshot, agreementSnapshot, amendmentSnapshot] = await Promise.all([
      transaction.get(receiptRef), transaction.get(orderRef), transaction.get(agreementRef), transaction.get(amendmentRef),
    ]);
    if (receipt.exists) return receipt.data()?.result as AmendmentDto;
    if (!orderSnapshot.exists || !agreementSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ или подтверждённые условия не найдены');
    const order = orderDomain(orderSnapshot.id, orderSnapshot.data() ?? {});
    const agreement = agreementDomain(agreementSnapshot.data() ?? {});
    const now = Timestamp.now();
    let result: AmendmentDto;
    let eventType: string;
    if (command.action === 'propose') {
      if (!command.input) throw new DomainError('VALIDATION_ERROR', 'Заполните изменения');
      const decision = decideAmendmentProposal(order, agreement, command.actorId, command.input);
      const version = amendmentSnapshot.exists ? numberValue(amendmentSnapshot.data()?.version) + 1 : 1;
      const stored = {
        ...decision, version, status: 'pending', confirmations: { customer: false, master: false },
        proposedBy: command.actorId, createdAt: amendmentSnapshot.exists ? amendmentSnapshot.data()?.createdAt ?? now : now,
        updatedAt: now,
      };
      result = amendmentDto(stored);
      transaction.set(amendmentRef, stored);
      transaction.create(amendmentRef.collection('versions').doc(String(version).padStart(6, '0')), { ...stored, recordedAt: now });
      transaction.update(orderRef, { amendmentStatus: 'pending', amendmentVersion: version, updatedAt: now });
      notify(transaction, command.actorId === order.customerId ? order.selectedMasterId! : order.customerId, 'amendment_pending', 'Предложено изменение заказа', 'Проверьте обновлённые мерки, описание и срок', command.orderId, now);
      eventType = 'order_amendment_proposed';
    } else {
      if (!amendmentSnapshot.exists) throw new DomainError('INVALID_STATE', 'Сначала предложите изменение');
      const amendment = amendmentSnapshot.data() ?? {};
      if (amendment.status !== 'pending') throw new DomainError('INVALID_STATE', 'Это изменение уже подтверждено');
      if (numberValue(amendment.baseAgreementVersion) !== agreement.version) throw new DomainError('INVALID_STATE', 'Базовые условия уже изменились; создайте новое предложение');
      const confirmation = decideAmendmentConfirmation(order, command.actorId, confirmations(amendment.confirmations));
      const version = numberValue(amendment.version);
      const confirmedAt = confirmation.fullyConfirmed ? now : undefined;
      const update = { confirmations: confirmation.confirmations, status: confirmation.fullyConfirmed ? 'confirmed' : 'pending', ...(confirmedAt ? { confirmedAt } : {}), updatedAt: now };
      transaction.update(amendmentRef, update);
      transaction.update(amendmentRef.collection('versions').doc(String(version).padStart(6, '0')), update);
      if (confirmation.fullyConfirmed) {
        const targetVersion = numberValue(amendment.targetAgreementVersion);
        const newAgreement = {
          ...agreementSnapshot.data(),
          description: stringValue(amendment.description), measurements: stringValue(amendment.measurements),
          deadline: stringValue(amendment.deadline), ...(stringValue(amendment.tolerances) ? { tolerances: stringValue(amendment.tolerances) } : { tolerances: null }),
          version: targetVersion, status: 'confirmed', confirmations: { customer: true, master: true },
          proposedBy: stringValue(amendment.proposedBy), confirmedAt: now, updatedAt: now,
        };
        transaction.set(agreementRef, newAgreement);
        transaction.create(agreementRef.collection('versions').doc(String(targetVersion).padStart(6, '0')), { ...newAgreement, recordedAt: now, sourceAmendmentVersion: version });
        transaction.update(orderRef, {
          description: stringValue(amendment.description), measurements: stringValue(amendment.measurements), deadline: stringValue(amendment.deadline),
          agreementVersion: targetVersion, amendmentStatus: 'confirmed', updatedAt: now,
        });
        for (const userId of [order.customerId, order.selectedMasterId!]) notify(transaction, userId, 'amendment_confirmed', 'Изменение заказа согласовано', `Действует версия условий №${targetVersion}`, command.orderId, now);
        eventType = 'order_amendment_confirmed';
      } else {
        notify(transaction, command.actorId === order.customerId ? order.selectedMasterId! : order.customerId, 'amendment_pending', 'Изменение ждёт подтверждения', 'Вторая сторона уже подтвердила текущую версию', command.orderId, now);
        eventType = 'order_amendment_party_confirmed';
      }
      result = amendmentDto({ ...amendment, ...update });
    }
    transaction.create(adminDb.collection('auditEvents').doc(), { aggregateType: 'order_amendment', aggregateId: command.orderId, eventType, actorId: command.actorId, commandId: command.commandId, payload: { amendmentVersion: result.version, targetAgreementVersion: result.targetAgreementVersion }, createdAt: now });
    transaction.create(receiptRef, { commandType: `order_amendment_${command.action}`, actorId: command.actorId, result, createdAt: now });
    return result;
  });
}

function orderDomain(id: string, data: DocumentData) { return { id, customerId: stringValue(data.customerId), selectedMasterId: stringValue(data.selectedMasterId) || undefined, status: stringValue(data.status), paymentStatus: stringValue(data.paymentStatus) || undefined }; }
function agreementDomain(data: DocumentData) { return { status: stringValue(data.status), version: numberValue(data.version), description: stringValue(data.description), measurements: stringValue(data.measurements), deadline: stringValue(data.deadline), tolerances: stringValue(data.tolerances) || undefined, finalPrice: numberValue(data.finalPrice) }; }
function amendmentDto(data: DocumentData): AmendmentDto { return { orderId: stringValue(data.orderId), version: numberValue(data.version), baseAgreementVersion: numberValue(data.baseAgreementVersion), targetAgreementVersion: numberValue(data.targetAgreementVersion), status: data.status === 'confirmed' ? 'confirmed' : 'pending', description: stringValue(data.description), measurements: stringValue(data.measurements), deadline: stringValue(data.deadline), ...(stringValue(data.tolerances) ? { tolerances: stringValue(data.tolerances) } : {}), finalPrice: numberValue(data.finalPrice), reason: stringValue(data.reason), confirmations: confirmations(data.confirmations), proposedBy: stringValue(data.proposedBy), updatedAt: timestampIso(data.updatedAt), ...(data.confirmedAt instanceof Timestamp ? { confirmedAt: timestampIso(data.confirmedAt) } : {}) }; }
function requireParticipant(order: DocumentData, actorId: string) { if (actorId !== order.customerId && actorId !== order.selectedMasterId) throw new DomainError('FORBIDDEN', 'Изменение доступно только участникам заказа'); }
function confirmations(value: unknown): AmendmentConfirmations { const data = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return { customer: data.customer === true, master: data.master === true }; }
function notify(transaction: Transaction, userId: string, type: string, title: string, body: string, orderId: string, now: Timestamp) { transaction.create(adminDb.collection('notifications').doc(), { userId, type, title, body, orderId, read: false, createdAt: now, createdBy: 'system' }); }
function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }
function numberValue(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : 0; }
function timestampIso(value: unknown) { return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString(); }
