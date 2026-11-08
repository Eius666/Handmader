import 'server-only';

import { Timestamp, type DocumentData, type Transaction } from 'firebase-admin/firestore';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import type { AmendmentDto } from '@/modules/amendments/infrastructure/firestore/amendments';
import { decideTestPriceAdjustment } from '../../domain/price-adjustment';
import { mockPaymentProvider } from '../mock/mock-payment-provider';

export async function settleTestPriceAdjustmentInFirestore(command: {
  orderId: string;
  actorId: string;
  commandId: string;
}): Promise<AmendmentDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const paymentRef = adminDb.collection('payments').doc(command.orderId);
  const agreementRef = adminDb.collection('agreements').doc(command.orderId);
  const amendmentRef = adminDb.collection('orderAmendments').doc(command.orderId);
  const advanceRef = adminDb.collection('materialAdvances').doc(command.orderId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  const [existingReceipt, orderSnapshot, paymentSnapshot, amendmentSnapshot, advanceSnapshot] = await Promise.all([
    receiptRef.get(), orderRef.get(), paymentRef.get(), amendmentRef.get(), advanceRef.get(),
  ]);
  if (existingReceipt.exists) return existingReceipt.data()?.result as AmendmentDto;
  if (!orderSnapshot.exists || !paymentSnapshot.exists || !amendmentSnapshot.exists) {
    throw new DomainError('NOT_FOUND', 'Заказ, тестовый платёж или изменение не найдены');
  }
  const initialDecision = decideTestPriceAdjustment(
    orderDomain(orderSnapshot.id, orderSnapshot.data() ?? {}),
    paymentDomain(paymentSnapshot.data() ?? {}),
    amendmentDomain(amendmentSnapshot.data() ?? {}),
    command.actorId,
    releasedAdvance(advanceSnapshot.data()),
  );
  const providerResult = initialDecision.type === 'top_up'
    ? await mockPaymentProvider.fund({ orderId: command.orderId, amountMinor: initialDecision.amountMinor, currency: 'RUB', idempotencyKey: command.commandId })
    : await mockPaymentProvider.refund({ paymentId: paymentSnapshot.id, orderId: command.orderId, amountMinor: initialDecision.amountMinor, currency: 'RUB', idempotencyKey: command.commandId });

  return adminDb.runTransaction(async (transaction) => {
    const [receipt, currentOrder, currentPayment, currentAgreement, currentAmendment, currentAdvance] = await Promise.all([
      transaction.get(receiptRef), transaction.get(orderRef), transaction.get(paymentRef), transaction.get(agreementRef), transaction.get(amendmentRef), transaction.get(advanceRef),
    ]);
    if (receipt.exists) return receipt.data()?.result as AmendmentDto;
    if (!currentOrder.exists || !currentPayment.exists || !currentAgreement.exists || !currentAmendment.exists) {
      throw new DomainError('NOT_FOUND', 'Данные сделки изменились');
    }
    const amendment = currentAmendment.data() ?? {};
    const agreement = currentAgreement.data() ?? {};
    if (numberValue(amendment.baseAgreementVersion) !== numberValue(agreement.version)) {
      throw new DomainError('INVALID_STATE', 'Базовые условия уже изменились');
    }
    const decision = decideTestPriceAdjustment(
      orderDomain(currentOrder.id, currentOrder.data() ?? {}),
      paymentDomain(currentPayment.data() ?? {}),
      amendmentDomain(amendment),
      command.actorId,
      releasedAdvance(currentAdvance.data()),
    );
    if (decision.type !== initialDecision.type || decision.amountMinor !== initialDecision.amountMinor) {
      throw new DomainError('INVALID_STATE', 'Сумма корректировки изменилась; обновите страницу');
    }
    const now = Timestamp.now();
    const adjustment = {
      type: decision.type,
      amountMinor: decision.amountMinor,
      status: 'completed' as const,
      provider: providerResult.provider,
      ...(decision.type === 'top_up'
        ? { providerPaymentId: 'providerPaymentId' in providerResult ? providerResult.providerPaymentId : '' }
        : { providerRefundId: 'providerRefundId' in providerResult ? providerResult.providerRefundId : '' }),
      completedAt: now,
      testMode: true,
    };
    const targetVersion = numberValue(amendment.targetAgreementVersion);
    const amendmentVersion = numberValue(amendment.version);
    const newAgreement = {
      ...agreement,
      description: stringValue(amendment.description),
      measurements: stringValue(amendment.measurements),
      deadline: stringValue(amendment.deadline),
      ...(stringValue(amendment.tolerances) ? { tolerances: stringValue(amendment.tolerances) } : { tolerances: null }),
      finalPrice: numberValue(amendment.finalPrice),
      version: targetVersion,
      status: 'confirmed',
      confirmations: { customer: true, master: true },
      proposedBy: stringValue(amendment.proposedBy),
      confirmedAt: now,
      updatedAt: now,
    };
    const amendmentUpdate = { status: 'confirmed', priceAdjustment: adjustment, confirmedAt: now, updatedAt: now };
    const result = amendmentDto({ ...amendment, ...amendmentUpdate });

    transaction.update(paymentRef, {
      grossAmountMinor: decision.targetGrossAmountMinor,
      commissionBps: decision.commissionBps,
      commissionAmountMinor: decision.commissionAmountMinor,
      masterAmountMinor: decision.masterAmountMinor,
      updatedAt: now,
    });
    transaction.create(paymentRef.collection('events').doc(), {
      type: decision.type === 'top_up' ? 'price_adjustment_top_up_completed' : 'price_adjustment_refund_completed',
      amountMinor: decision.amountMinor,
      previousGrossAmountMinor: decision.previousGrossAmountMinor,
      targetGrossAmountMinor: decision.targetGrossAmountMinor,
      provider: 'mock',
      testMode: true,
      commandId: command.commandId,
      createdAt: now,
    });
    transaction.update(amendmentRef, amendmentUpdate);
    transaction.update(amendmentRef.collection('versions').doc(String(amendmentVersion).padStart(6, '0')), amendmentUpdate);
    transaction.set(agreementRef, newAgreement);
    transaction.create(agreementRef.collection('versions').doc(String(targetVersion).padStart(6, '0')), { ...newAgreement, recordedAt: now, sourceAmendmentVersion: amendmentVersion });
    transaction.update(orderRef, {
      description: stringValue(amendment.description), measurements: stringValue(amendment.measurements), deadline: stringValue(amendment.deadline),
      finalPrice: numberValue(amendment.finalPrice), agreementVersion: targetVersion, amendmentStatus: 'confirmed', updatedAt: now,
    });
    for (const userId of [decision.customerId, decision.masterId]) {
      notify(transaction, userId, 'price_adjustment_completed', 'Изменение цены завершено', `Новая тестовая сумма заказа: ${decision.targetGrossAmountMinor / 100} ₽; реальные деньги не переводились`, command.orderId, now);
    }
    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'payment', aggregateId: paymentRef.id, eventType: `mock_price_adjustment_${decision.type}_completed`, actorId: command.actorId, commandId: command.commandId,
      payload: { orderId: command.orderId, amountMinor: decision.amountMinor, previousGrossAmountMinor: decision.previousGrossAmountMinor, targetGrossAmountMinor: decision.targetGrossAmountMinor }, createdAt: now,
    });
    transaction.create(receiptRef, { commandType: 'settle_mock_price_adjustment', actorId: command.actorId, result, createdAt: now });
    return result;
  });
}

function orderDomain(id: string, data: DocumentData) { return { id, customerId: stringValue(data.customerId), selectedMasterId: stringValue(data.selectedMasterId) || undefined, status: stringValue(data.status), paymentStatus: stringValue(data.paymentStatus) || undefined }; }
function paymentDomain(data: DocumentData) { return { status: stringValue(data.status), testMode: data.testMode === true, currency: stringValue(data.currency), grossAmountMinor: numberValue(data.grossAmountMinor) }; }
function amendmentDomain(data: DocumentData) { const value = data.confirmations && typeof data.confirmations === 'object' ? data.confirmations as Record<string, unknown> : {}; return { status: stringValue(data.status), finalPrice: numberValue(data.finalPrice), confirmations: { customer: value.customer === true, master: value.master === true } }; }
function releasedAdvance(data: DocumentData | undefined) { if (!data || !['authorized', 'evidence_submitted'].includes(stringValue(data.status))) return 0; return numberValue(data.requestedAmountMinor); }
function amendmentDto(data: DocumentData): AmendmentDto { const price = data.priceAdjustment && typeof data.priceAdjustment === 'object' ? data.priceAdjustment as Record<string, unknown> : {}; return { orderId: stringValue(data.orderId), version: numberValue(data.version), baseAgreementVersion: numberValue(data.baseAgreementVersion), targetAgreementVersion: numberValue(data.targetAgreementVersion), status: data.status === 'confirmed' ? 'confirmed' : data.status === 'financial_pending' ? 'financial_pending' : 'pending', description: stringValue(data.description), measurements: stringValue(data.measurements), deadline: stringValue(data.deadline), ...(stringValue(data.tolerances) ? { tolerances: stringValue(data.tolerances) } : {}), finalPrice: numberValue(data.finalPrice), reason: stringValue(data.reason), confirmations: amendmentDomain(data).confirmations, ...(price.type === 'top_up' || price.type === 'refund' ? { priceAdjustment: { type: price.type, amountMinor: numberValue(price.amountMinor), status: price.status === 'completed' ? 'completed' : 'pending' } } : {}), proposedBy: stringValue(data.proposedBy), updatedAt: timestampIso(data.updatedAt), ...(data.confirmedAt instanceof Timestamp ? { confirmedAt: timestampIso(data.confirmedAt) } : {}) }; }
function notify(transaction: Transaction, userId: string, type: string, title: string, body: string, orderId: string, now: Timestamp) { transaction.create(adminDb.collection('notifications').doc(), { userId, type, title, body, orderId, read: false, createdAt: now, createdBy: 'system' }); }
function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }
function numberValue(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? value : 0; }
function timestampIso(value: unknown) { return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString(); }
