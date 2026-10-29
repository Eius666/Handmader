import 'server-only';

import { FieldValue, Timestamp, type DocumentData, type Transaction } from 'firebase-admin/firestore';

import type { StaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { createPublicAlias } from '@/modules/users/domain/public-alias';
import { decideDisputeOpening, decideDisputeResolution, decideEvidenceAddition, type DisputeResolution } from '../../domain/dispute';

export interface DisputeEvidenceDto { id: string; authorAlias: string; description: string; sourceUrl?: string; createdAt: string }
export interface DisputeDto {
  id: string; orderId: string; status: 'open' | 'resolved'; openedByAlias: string; reason: string; createdAt: string;
  evidence: DisputeEvidenceDto[]; resolution?: DisputeResolution; decisionSummary?: string;
  customerRefundAmountMinor?: number; masterPayoutAmountMinor?: number; platformFeeAmountMinor?: number; resolvedAt?: string;
}
export interface StaffDisputeDto extends DisputeDto {
  orderTitle: string; orderStatus: string; customerAlias: string; masterAlias: string; grossAmountMinor: number;
  suggestedMasterAmountMinor: number; suggestedPlatformFeeAmountMinor: number;
}

interface ParticipantCommand { orderId: string; actorId: string; commandId: string }

export async function getActiveDisputeFromFirestore(orderId: string, actorId: string): Promise<DisputeDto | null> {
  const order = await requireParticipantOrder(orderId, actorId);
  const disputeId = stringValue(order.activeDisputeId);
  if (!disputeId) return null;
  const disputeSnapshot = await adminDb.collection('disputes').doc(disputeId).get();
  if (!disputeSnapshot.exists) return null;
  return disputeDto(disputeSnapshot.id, disputeSnapshot.data() ?? {}, await loadEvidence(disputeSnapshot.id));
}

export async function openDisputeInFirestore(command: ParticipantCommand & { reason: unknown }): Promise<DisputeDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const disputeRef = adminDb.collection('disputes').doc(command.commandId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);
  const evidenceRef = disputeRef.collection('evidence').doc(command.commandId);
  return adminDb.runTransaction(async (transaction) => {
    const [receipt, orderSnapshot] = await Promise.all([transaction.get(receiptRef), transaction.get(orderRef)]);
    if (receipt.exists) return receipt.data()?.result as DisputeDto;
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
    const order = orderSnapshot.data() ?? {};
    const decision = decideDisputeOpening(orderDomain(orderSnapshot.id, order), command.actorId, command.reason);
    const masterId = stringValue(order.selectedMasterId);
    const now = Timestamp.now();
    const data = {
      orderId: command.orderId, customerId: stringValue(order.customerId), masterId, openedBy: command.actorId,
      status: 'open', reason: decision.reason, orderStatusAtOpen: stringValue(order.status), createdAt: now, updatedAt: now,
    };
    const initialEvidence = { authorId: command.actorId, description: decision.reason, kind: 'statement', createdAt: now };
    const result = disputeDto(disputeRef.id, data, [{ id: evidenceRef.id, authorAlias: aliasFor(command.actorId, data), description: decision.reason, createdAt: now.toDate().toISOString() }]);
    transaction.create(disputeRef, data);
    transaction.create(evidenceRef, initialEvidence);
    transaction.update(orderRef, { disputeStatus: 'open', activeDisputeId: disputeRef.id, updatedAt: now });
    createNotification(transaction, command.actorId === data.customerId ? masterId : data.customerId, 'dispute_opened', 'Открыт спор', 'Администрация рассмотрит доказательства обеих сторон', command.orderId, now);
    transaction.create(adminDb.collection('auditEvents').doc(), { aggregateType: 'dispute', aggregateId: disputeRef.id, eventType: 'dispute_opened', actorId: command.actorId, commandId: command.commandId, payload: { orderId: command.orderId, reason: decision.reason }, createdAt: now });
    transaction.create(adminDb.collection('outboxEvents').doc(), { type: 'dispute.opened', aggregateId: disputeRef.id, payload: { orderId: command.orderId, disputeId: disputeRef.id }, status: 'pending', attempts: 0, availableAt: now, createdAt: now });
    transaction.create(receiptRef, { commandType: 'open_dispute', actorId: command.actorId, result, createdAt: now });
    return result;
  });
}

export async function addDisputeEvidenceInFirestore(command: ParticipantCommand & { description: unknown; sourceUrl: unknown }): Promise<DisputeDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);
  return adminDb.runTransaction(async (transaction) => {
    const [receipt, orderSnapshot] = await Promise.all([transaction.get(receiptRef), transaction.get(orderRef)]);
    if (receipt.exists) return receipt.data()?.result as DisputeDto;
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
    const order = orderSnapshot.data() ?? {};
    requireParticipant(order, command.actorId);
    const disputeId = stringValue(order.activeDisputeId);
    if (!disputeId) throw new DomainError('NOT_FOUND', 'Спор не найден');
    const disputeRef = adminDb.collection('disputes').doc(disputeId);
    const disputeSnapshot = await transaction.get(disputeRef);
    if (!disputeSnapshot.exists) throw new DomainError('NOT_FOUND', 'Спор не найден');
    const dispute = disputeSnapshot.data() ?? {};
    const decision = decideEvidenceAddition(disputeDomain(disputeSnapshot.id, dispute), command.actorId, command.description, command.sourceUrl);
    const evidenceRef = disputeRef.collection('evidence').doc(command.commandId);
    const existingEvidence = await transaction.get(disputeRef.collection('evidence').orderBy('createdAt', 'asc').limit(200));
    const now = Timestamp.now();
    transaction.create(evidenceRef, { authorId: command.actorId, ...decision, kind: decision.sourceUrl ? 'link' : 'statement', createdAt: now });
    transaction.update(disputeRef, { updatedAt: now, evidenceCount: FieldValue.increment(1) });
    transaction.create(adminDb.collection('auditEvents').doc(), { aggregateType: 'dispute', aggregateId: disputeId, eventType: 'dispute_evidence_added', actorId: command.actorId, commandId: command.commandId, payload: { evidenceId: evidenceRef.id, hasLink: Boolean(decision.sourceUrl) }, createdAt: now });
    const evidence = existingEvidence.docs.map((item) => evidenceDto(item.id, item.data(), dispute));
    evidence.push({ id: evidenceRef.id, authorAlias: aliasFor(command.actorId, dispute), ...decision, createdAt: now.toDate().toISOString() });
    const result = disputeDto(disputeId, dispute, evidence);
    transaction.create(receiptRef, { commandType: 'add_dispute_evidence', actorId: command.actorId, result, createdAt: now });
    return result;
  });
}

export async function listOpenDisputesFromFirestore(): Promise<StaffDisputeDto[]> {
  const snapshot = await adminDb.collection('disputes').where('status', '==', 'open').limit(100).get();
  return Promise.all(snapshot.docs.map(async (item) => {
    const data = item.data();
    const orderId = stringValue(data.orderId);
    const [orderSnapshot, paymentSnapshot, evidence] = await Promise.all([
      adminDb.collection('orders').doc(orderId).get(), adminDb.collection('payments').doc(orderId).get(), loadEvidence(item.id),
    ]);
    const order = orderSnapshot.data() ?? {};
    const payment = paymentSnapshot.data() ?? {};
    return {
      ...disputeDto(item.id, data, evidence), orderTitle: stringValue(order.title) || stringValue(order.description) || 'Заказ',
      orderStatus: stringValue(order.status), customerAlias: createPublicAlias('customer', stringValue(data.customerId)), masterAlias: createPublicAlias('master', stringValue(data.masterId)),
      grossAmountMinor: numberValue(payment.grossAmountMinor), suggestedMasterAmountMinor: numberValue(payment.masterAmountMinor), suggestedPlatformFeeAmountMinor: numberValue(payment.commissionAmountMinor),
    };
  }));
}

export async function resolveDisputeInFirestore(command: {
  disputeId: string; staff: StaffActor; commandId: string; resolution: unknown; decisionSummary: unknown;
  customerRefundAmountMinor: unknown; masterPayoutAmountMinor: unknown; platformFeeAmountMinor: unknown;
}): Promise<DisputeDto> {
  const disputeRef = adminDb.collection('disputes').doc(command.disputeId);
  const receiptRef = disputeRef.collection('commandReceipts').doc(command.commandId);
  return adminDb.runTransaction(async (transaction) => {
    const [receipt, disputeSnapshot] = await Promise.all([transaction.get(receiptRef), transaction.get(disputeRef)]);
    if (receipt.exists) return receipt.data()?.result as DisputeDto;
    if (!disputeSnapshot.exists) throw new DomainError('NOT_FOUND', 'Спор не найден');
    const dispute = disputeSnapshot.data() ?? {};
    const orderId = stringValue(dispute.orderId);
    const orderRef = adminDb.collection('orders').doc(orderId);
    const paymentRef = adminDb.collection('payments').doc(orderId);
    const [orderSnapshot, paymentSnapshot, evidenceSnapshot] = await Promise.all([
      transaction.get(orderRef), transaction.get(paymentRef), transaction.get(disputeRef.collection('evidence')),
    ]);
    if (!orderSnapshot.exists || !paymentSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ или тестовая оплата не найдены');
    const payment = paymentSnapshot.data() ?? {};
    const decision = decideDisputeResolution({ disputeStatus: stringValue(dispute.status), grossAmountMinor: numberValue(payment.grossAmountMinor), ...command });
    const now = Timestamp.now();
    const decisionRef = disputeRef.collection('decisions').doc(command.commandId);
    const evidenceIds = evidenceSnapshot.docs.map((item) => item.id);
    const currentOrderStatus = stringValue(orderSnapshot.data()?.status);
    const nextOrderStatus = decision.resolution === 'accept_order' && currentOrderStatus !== 'completed'
      ? 'accepted'
      : currentOrderStatus;
    const settlementStatus = decision.resolution === 'accept_order' ? 'payout_pending' : 'refund_pending';
    const resolvedData = { status: 'resolved', ...decision, evidenceIds, resolvedAt: now, resolvedBy: command.staff.uid, resolvedByRole: command.staff.role, updatedAt: now };
    const result = disputeDto(disputeRef.id, { ...dispute, ...resolvedData }, evidenceSnapshot.docs.map((item) => evidenceDto(item.id, item.data(), dispute)));
    transaction.update(disputeRef, resolvedData);
    transaction.create(decisionRef, { ...decision, evidenceIds, staffId: command.staff.uid, staffRole: command.staff.role, createdAt: now });
    transaction.update(orderRef, { status: nextOrderStatus, disputeStatus: decision.resolution === 'accept_order' ? 'resolved_accept' : 'resolved_refund', disputeResolution: decision.resolution, settlementStatus, updatedAt: now, ...(decision.resolution === 'accept_order' ? { acceptedAt: now } : {}) });
    transaction.update(paymentRef, { settlementStatus, disputeDecisionId: decisionRef.id, updatedAt: now });
    for (const userId of [stringValue(dispute.customerId), stringValue(dispute.masterId)]) createNotification(transaction, userId, 'dispute_resolved', 'Спор разрешён', decision.decisionSummary, orderId, now);
    transaction.create(adminDb.collection('auditEvents').doc(), { aggregateType: 'dispute', aggregateId: disputeRef.id, eventType: 'dispute_resolved', actorId: command.staff.uid, actorRole: command.staff.role, commandId: command.commandId, payload: { orderId, resolution: decision.resolution, evidenceIds, customerRefundAmountMinor: decision.customerRefundAmountMinor, masterPayoutAmountMinor: decision.masterPayoutAmountMinor, platformFeeAmountMinor: decision.platformFeeAmountMinor }, createdAt: now });
    transaction.create(receiptRef, { commandType: 'resolve_dispute', actorId: command.staff.uid, result, createdAt: now });
    return result;
  });
}

async function requireParticipantOrder(orderId: string, actorId: string): Promise<DocumentData> {
  const snapshot = await adminDb.collection('orders').doc(orderId).get();
  if (!snapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
  const data = snapshot.data() ?? {}; requireParticipant(data, actorId); return data;
}
function requireParticipant(order: DocumentData, actorId: string) {
  if (actorId !== order.customerId && actorId !== order.selectedMasterId) throw new DomainError('FORBIDDEN', 'Спор доступен только участникам заказа');
}
async function loadEvidence(disputeId: string): Promise<DisputeEvidenceDto[]> {
  const disputeSnapshot = await adminDb.collection('disputes').doc(disputeId).get();
  const data = disputeSnapshot.data() ?? {};
  const snapshot = await adminDb.collection('disputes').doc(disputeId).collection('evidence').orderBy('createdAt', 'asc').limit(200).get();
  return snapshot.docs.map((item) => evidenceDto(item.id, item.data(), data));
}
function disputeDto(id: string, data: DocumentData, evidence: DisputeEvidenceDto[]): DisputeDto {
  const result: DisputeDto = { id, orderId: stringValue(data.orderId), status: data.status === 'resolved' ? 'resolved' : 'open', openedByAlias: aliasFor(stringValue(data.openedBy), data), reason: stringValue(data.reason), createdAt: timestampIso(data.createdAt), evidence };
  if (['accept_order', 'full_refund', 'partial_refund'].includes(data.resolution)) result.resolution = data.resolution;
  if (typeof data.decisionSummary === 'string') result.decisionSummary = data.decisionSummary;
  for (const key of ['customerRefundAmountMinor', 'masterPayoutAmountMinor', 'platformFeeAmountMinor'] as const) if (typeof data[key] === 'number') result[key] = data[key];
  if (data.resolvedAt) result.resolvedAt = timestampIso(data.resolvedAt);
  return result;
}
function evidenceDto(id: string, data: DocumentData, dispute: DocumentData): DisputeEvidenceDto {
  return { id, authorAlias: aliasFor(stringValue(data.authorId), dispute), description: stringValue(data.description), ...(typeof data.sourceUrl === 'string' ? { sourceUrl: data.sourceUrl } : {}), createdAt: timestampIso(data.createdAt) };
}
function aliasFor(userId: string, dispute: DocumentData) { return userId === dispute.customerId ? createPublicAlias('customer', userId) : createPublicAlias('master', userId); }
function orderDomain(id: string, data: DocumentData) { return { id, customerId: stringValue(data.customerId), selectedMasterId: stringValue(data.selectedMasterId) || undefined, status: stringValue(data.status), paymentStatus: stringValue(data.paymentStatus) || undefined, disputeStatus: stringValue(data.disputeStatus) || undefined }; }
function disputeDomain(id: string, data: DocumentData) { return { id, orderId: stringValue(data.orderId), customerId: stringValue(data.customerId), masterId: stringValue(data.masterId), status: data.status === 'resolved' ? 'resolved' as const : 'open' as const }; }
function createNotification(transaction: Transaction, userId: string, type: string, title: string, body: string, orderId: string, now: Timestamp) { if (userId) transaction.create(adminDb.collection('notifications').doc(), { userId, type, title, body, orderId, read: false, createdAt: now, createdBy: 'system' }); }
function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }
function numberValue(value: unknown) { return typeof value === 'number' && Number.isSafeInteger(value) ? value : 0; }
function timestampIso(value: unknown) { return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString(); }
