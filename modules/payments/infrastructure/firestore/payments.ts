import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { decideMockPayment } from '../../domain/mock-payment';
import { mockPaymentProvider } from '../mock/mock-payment-provider';

export interface MockPaymentResultDto {
  paymentId: string;
  orderId: string;
  status: 'funded';
  provider: 'mock';
  currency: 'RUB';
  grossAmountMinor: number;
  commissionAmountMinor: number;
  masterAmountMinor: number;
  repeated: boolean;
}

export async function simulateSuccessfulPaymentInFirestore(command: {
  orderId: string;
  actorId: string;
  commandId: string;
}): Promise<MockPaymentResultDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const paymentRef = adminDb.collection('payments').doc(command.orderId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  const existingReceipt = await receiptRef.get();
  if (existingReceipt.exists) {
    return { ...(existingReceipt.data()?.result as MockPaymentResultDto), repeated: true };
  }
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
  const order = orderSnapshot.data() ?? {};
  const decision = decideMockPayment({
    id: orderSnapshot.id,
    customerId: String(order.customerId ?? ''),
    selectedMasterId: typeof order.selectedMasterId === 'string' ? order.selectedMasterId : undefined,
    status: String(order.status ?? ''),
    agreementStatus: typeof order.agreementStatus === 'string' ? order.agreementStatus : undefined,
    finalPrice: typeof order.finalPrice === 'number' ? order.finalPrice : undefined,
  }, command.actorId);
  const providerResult = await mockPaymentProvider.fund({
    orderId: command.orderId,
    amountMinor: decision.grossAmountMinor,
    currency: decision.currency,
    idempotencyKey: command.commandId,
  });

  return adminDb.runTransaction(async (transaction) => {
    const [transactionReceipt, currentOrder, existingPayment] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ]);
    if (transactionReceipt.exists) {
      return { ...(transactionReceipt.data()?.result as MockPaymentResultDto), repeated: true };
    }
    if (existingPayment.exists) {
      throw new DomainError('INVALID_STATE', 'Тестовая оплата уже проведена');
    }
    if (!currentOrder.exists || currentOrder.data()?.status !== 'awaiting_payment') {
      throw new DomainError('INVALID_STATE', 'Состояние заказа изменилось; обновите страницу');
    }
    const now = Timestamp.now();
    const result: MockPaymentResultDto = {
      paymentId: paymentRef.id,
      orderId: command.orderId,
      status: providerResult.status,
      provider: 'mock',
      currency: decision.currency,
      grossAmountMinor: decision.grossAmountMinor,
      commissionAmountMinor: decision.commissionAmountMinor,
      masterAmountMinor: decision.masterAmountMinor,
      repeated: false,
    };

    transaction.create(paymentRef, {
      ...decision,
      provider: providerResult.provider,
      providerPaymentId: providerResult.providerPaymentId,
      status: providerResult.status,
      testMode: true,
      createdAt: now,
      fundedAt: now,
      updatedAt: now,
    });
    for (const eventType of ['payment_created', 'payment_confirmed', 'funds_reserved']) {
      transaction.create(paymentRef.collection('events').doc(), {
        type: eventType,
        provider: 'mock',
        commandId: command.commandId,
        createdAt: now,
      });
    }
    transaction.update(orderRef, {
      status: 'paid',
      paymentStatus: 'funded',
      paymentId: paymentRef.id,
      paidAt: now,
      updatedAt: now,
    });
    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'payment',
      aggregateId: paymentRef.id,
      eventType: 'mock_payment_funded',
      actorId: command.actorId,
      commandId: command.commandId,
      payload: {
        orderId: command.orderId,
        grossAmountMinor: decision.grossAmountMinor,
        commissionAmountMinor: decision.commissionAmountMinor,
      },
      createdAt: now,
    });
    for (const userId of [decision.customerId, decision.masterId]) {
      transaction.create(adminDb.collection('notifications').doc(), {
        userId,
        type: 'payment_confirmed',
        title: 'Тестовая оплата подтверждена',
        body: 'Средства зарезервированы в тестовом контуре; реальные деньги не списаны',
        orderId: command.orderId,
        read: false,
        createdAt: now,
        createdBy: 'system',
      });
    }
    transaction.create(receiptRef, {
      commandType: 'simulate_mock_payment',
      actorId: command.actorId,
      result,
      createdAt: now,
    });
    return result;
  });
}
