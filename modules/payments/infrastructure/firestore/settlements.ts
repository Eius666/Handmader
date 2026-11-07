import 'server-only';

import { FieldValue, Timestamp, type DocumentData, type Transaction } from 'firebase-admin/firestore';

import type { StaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { createPublicAlias } from '@/modules/users/domain/public-alias';
import { decideTestSettlement } from '../../domain/settlement';
import { mockPaymentProvider } from '../mock/mock-payment-provider';

type SettlementOutcome = 'completed' | 'partially_refunded' | 'refunded';

export interface StaffSettlementDto {
  orderId: string;
  orderTitle: string;
  orderStatus: string;
  customerAlias: string;
  masterAlias: string;
  settlementStatus: string;
  grossAmountMinor: number;
  customerRefundAmountMinor: number;
  masterPayoutAmountMinor: number;
  platformFeeAmountMinor: number;
  outcome: SettlementOutcome;
}

export interface TestSettlementResultDto extends StaffSettlementDto {
  testMode: true;
  completedAt: string;
  repeated: boolean;
}

export async function listPendingSettlementsFromFirestore(): Promise<StaffSettlementDto[]> {
  const snapshot = await adminDb.collection('payments').where('status', '==', 'funded').limit(100).get();
  const rows = await Promise.all(snapshot.docs.map(async (paymentSnapshot) => {
    const orderSnapshot = await adminDb.collection('orders').doc(paymentSnapshot.id).get();
    if (!orderSnapshot.exists) return null;
    const order = orderSnapshot.data() ?? {};
    const payment = paymentSnapshot.data();
    if (stringValue(order.settlementStatus) === 'completed' || stringValue(payment.settlementStatus) === 'completed') return null;
    const dispute = await loadDecision(order);
    try {
      const decision = decideTestSettlement(orderDomain(orderSnapshot.id, order), paymentDomain(payment), dispute ? disputeDomain(dispute) : null);
      return toStaffDto(order, decision, stringValue(order.settlementStatus) || 'payout_pending');
    } catch {
      return null;
    }
  }));
  return rows.filter((row): row is StaffSettlementDto => row !== null);
}

export async function executeTestSettlementInFirestore(command: {
  orderId: string;
  staff: StaffActor;
  commandId: string;
}): Promise<TestSettlementResultDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const paymentRef = adminDb.collection('payments').doc(command.orderId);
  const receiptRef = paymentRef.collection('commandReceipts').doc(command.commandId);
  const existingReceipt = await receiptRef.get();
  if (existingReceipt.exists) return { ...(existingReceipt.data()?.result as TestSettlementResultDto), repeated: true };

  const [orderSnapshot, paymentSnapshot] = await Promise.all([orderRef.get(), paymentRef.get()]);
  if (!orderSnapshot.exists || !paymentSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ или тестовая оплата не найдены');
  const order = orderSnapshot.data() ?? {};
  const payment = paymentSnapshot.data() ?? {};
  const dispute = await loadDecision(order);
  const initialDecision = decideTestSettlement(orderDomain(orderSnapshot.id, order), paymentDomain(payment), dispute ? disputeDomain(dispute) : null);

  const payout = initialDecision.masterPayoutAmountMinor > 0
    ? await mockPaymentProvider.payout({ paymentId: paymentSnapshot.id, orderId: command.orderId, recipientId: initialDecision.masterId, amountMinor: initialDecision.masterPayoutAmountMinor, currency: 'RUB', idempotencyKey: command.commandId })
    : null;
  const refund = initialDecision.customerRefundAmountMinor > 0
    ? await mockPaymentProvider.refund({ paymentId: paymentSnapshot.id, orderId: command.orderId, amountMinor: initialDecision.customerRefundAmountMinor, currency: 'RUB', idempotencyKey: command.commandId })
    : null;

  return adminDb.runTransaction(async (transaction) => {
    const [currentReceipt, currentOrder, currentPayment] = await Promise.all([
      transaction.get(receiptRef), transaction.get(orderRef), transaction.get(paymentRef),
    ]);
    if (currentReceipt.exists) return { ...(currentReceipt.data()?.result as TestSettlementResultDto), repeated: true };
    if (!currentOrder.exists || !currentPayment.exists) throw new DomainError('NOT_FOUND', 'Заказ или тестовая оплата не найдены');
    const currentOrderData = currentOrder.data() ?? {};
    const disputeId = stringValue(currentOrderData.activeDisputeId);
    const currentDispute = disputeId ? await transaction.get(adminDb.collection('disputes').doc(disputeId)) : null;
    const decision = decideTestSettlement(
      orderDomain(currentOrder.id, currentOrderData),
      paymentDomain(currentPayment.data() ?? {}),
      currentDispute?.exists ? disputeDomain(currentDispute.data() ?? {}) : null,
    );
    if (JSON.stringify(decision) !== JSON.stringify(initialDecision)) throw new DomainError('INVALID_STATE', 'Состояние расчёта изменилось; обновите страницу');

    const now = Timestamp.now();
    const result: TestSettlementResultDto = {
      ...toStaffDto(currentOrderData, decision, 'completed'),
      testMode: true,
      completedAt: now.toDate().toISOString(),
      repeated: false,
    };
    if (payout) transaction.create(adminDb.collection('payouts').doc(command.orderId), {
      orderId: command.orderId, paymentId: currentPayment.id, recipientId: decision.masterId,
      amountMinor: decision.masterPayoutAmountMinor, currency: 'RUB', provider: payout.provider,
      providerPayoutId: payout.providerPayoutId, status: payout.status, testMode: true, createdAt: now, completedAt: now,
    });
    if (refund) transaction.create(adminDb.collection('refunds').doc(command.orderId), {
      orderId: command.orderId, paymentId: currentPayment.id, recipientId: decision.customerId,
      amountMinor: decision.customerRefundAmountMinor, currency: 'RUB', provider: refund.provider,
      providerRefundId: refund.providerRefundId, status: refund.status, testMode: true, createdAt: now, completedAt: now,
    });
    const events = [
      ...(payout ? ['payout_completed'] : []),
      ...(refund ? ['refund_created', 'refund_completed'] : []),
      'settlement_completed',
    ];
    for (const type of events) transaction.create(paymentRef.collection('events').doc(), { type, provider: 'mock', commandId: command.commandId, testMode: true, createdAt: now });
    transaction.update(paymentRef, {
      status: 'settled', settlementStatus: 'completed', settlementOutcome: decision.outcome,
      customerRefundAmountMinor: decision.customerRefundAmountMinor, masterPayoutAmountMinor: decision.masterPayoutAmountMinor,
      platformFeeAmountMinor: decision.platformFeeAmountMinor, settledAt: now, updatedAt: now,
    });
    transaction.update(orderRef, { status: decision.outcome, settlementStatus: 'completed', settlementOutcome: decision.outcome, settledAt: now, ...(decision.outcome === 'completed' ? { completedAt: now } : {}), updatedAt: now });
    if (decision.outcome === 'completed') {
      transaction.update(adminDb.collection('users').doc(decision.masterId), { 'masterProfile.completedOrders': FieldValue.increment(1), updatedAt: now });
      transaction.set(adminDb.collection('publicProfiles').doc(decision.masterId), { completedOrders: FieldValue.increment(1), updatedAt: now }, { merge: true });
    }
    notify(transaction, decision.customerId, decision.outcome === 'completed' ? 'test_settlement_completed' : 'test_refund_completed', decision.outcome === 'completed' ? 'Заказ завершён' : 'Тестовый возврат выполнен', 'Тестовый расчёт завершён; реальные деньги не переводились', command.orderId, now);
    notify(transaction, decision.masterId, 'test_settlement_completed', decision.outcome === 'completed' ? 'Тестовая выплата выполнена' : 'Спор и тестовый расчёт завершены', 'Тестовый расчёт завершён; реальные деньги не переводились', command.orderId, now);
    transaction.create(adminDb.collection('auditEvents').doc(), { aggregateType: 'payment', aggregateId: currentPayment.id, eventType: 'test_settlement_completed', actorId: command.staff.uid, actorRole: command.staff.role, commandId: command.commandId, payload: { orderId: command.orderId, outcome: decision.outcome, customerRefundAmountMinor: decision.customerRefundAmountMinor, masterPayoutAmountMinor: decision.masterPayoutAmountMinor, platformFeeAmountMinor: decision.platformFeeAmountMinor }, createdAt: now });
    transaction.create(receiptRef, { commandType: 'execute_test_settlement', actorId: command.staff.uid, result, createdAt: now });
    return result;
  });
}

async function loadDecision(order: DocumentData) {
  const disputeId = stringValue(order.activeDisputeId);
  if (!disputeId) return null;
  const snapshot = await adminDb.collection('disputes').doc(disputeId).get();
  return snapshot.exists ? snapshot.data() ?? null : null;
}
function orderDomain(id: string, data: DocumentData) { return { id, customerId: stringValue(data.customerId), selectedMasterId: stringValue(data.selectedMasterId) || undefined, status: stringValue(data.status), disputeStatus: stringValue(data.disputeStatus) || undefined, settlementStatus: stringValue(data.settlementStatus) || undefined }; }
function paymentDomain(data: DocumentData) { return { status: stringValue(data.status), testMode: data.testMode === true, currency: stringValue(data.currency), grossAmountMinor: numberValue(data.grossAmountMinor), masterAmountMinor: numberValue(data.masterAmountMinor), commissionAmountMinor: numberValue(data.commissionAmountMinor), settlementStatus: stringValue(data.settlementStatus) || undefined }; }
function disputeDomain(data: DocumentData) { return { status: stringValue(data.status), resolution: stringValue(data.resolution) || undefined, customerRefundAmountMinor: numberOrUndefined(data.customerRefundAmountMinor), masterPayoutAmountMinor: numberOrUndefined(data.masterPayoutAmountMinor), platformFeeAmountMinor: numberOrUndefined(data.platformFeeAmountMinor) }; }
function toStaffDto(order: DocumentData, decision: ReturnType<typeof decideTestSettlement>, settlementStatus: string): StaffSettlementDto { return { orderId: decision.orderId, orderTitle: stringValue(order.title) || stringValue(order.description) || 'Заказ', orderStatus: stringValue(order.status), customerAlias: createPublicAlias('customer', decision.customerId), masterAlias: createPublicAlias('master', decision.masterId), settlementStatus, grossAmountMinor: decision.grossAmountMinor, customerRefundAmountMinor: decision.customerRefundAmountMinor, masterPayoutAmountMinor: decision.masterPayoutAmountMinor, platformFeeAmountMinor: decision.platformFeeAmountMinor, outcome: decision.outcome }; }
function notify(transaction: Transaction, userId: string, type: string, title: string, body: string, orderId: string, now: Timestamp) { transaction.create(adminDb.collection('notifications').doc(), { userId, type, title, body, orderId, read: false, createdAt: now, createdBy: 'system' }); }
function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }
function numberValue(value: unknown) { return typeof value === 'number' && Number.isSafeInteger(value) ? value : 0; }
function numberOrUndefined(value: unknown) { return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined; }
