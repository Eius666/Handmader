import 'server-only';

import { Timestamp, type Transaction } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import {
  decideAgreementConfirmation,
  decideAgreementProposal,
  type AgreementConfirmations,
  type AgreementOrderSnapshot,
  type ProposeAgreementInput,
} from '../../domain/agreement';

export interface AgreementDto {
  orderId: string;
  version: number;
  status: 'pending' | 'confirmed';
  description: string;
  measurements: string;
  referencePhotos: string[];
  finalPrice: number;
  deadline: string;
  deliveryMethod: 'local' | 'delivery';
  deliveryIncluded: boolean;
  tolerances?: string;
  cancellationPolicyVersion: string;
  confirmations: AgreementConfirmations;
  proposedBy: string;
  updatedAt: string;
  confirmedAt?: string;
}

export interface AgreementCommand {
  orderId: string;
  actorId: string;
  commandId: string;
  action: 'propose' | 'confirm';
  input?: ProposeAgreementInput;
}

export async function changeAgreementInFirestore(command: AgreementCommand): Promise<AgreementDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const agreementRef = adminDb.collection('agreements').doc(command.orderId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const receiptSnapshot = await transaction.get(receiptRef);
    if (receiptSnapshot.exists) return receiptSnapshot.data()?.result as AgreementDto;

    const [orderSnapshot, agreementSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(agreementRef),
    ]);
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
    const order = orderSnapshotFromData(orderSnapshot.id, orderSnapshot.data() ?? {});
    const now = Timestamp.now();

    let result: AgreementDto;
    let eventType: string;
    if (command.action === 'propose') {
      if (!command.input) throw new DomainError('VALIDATION_ERROR', 'Заполните итоговые условия');
      const terms = decideAgreementProposal(order, command.actorId, command.input);
      const previousVersion = agreementSnapshot.exists
        ? numberValue(agreementSnapshot.data()?.version)
        : 0;
      const version = previousVersion + 1;
      result = {
        ...terms,
        version,
        status: 'pending',
        confirmations: { customer: false, master: false },
        proposedBy: command.actorId,
        updatedAt: now.toDate().toISOString(),
      };
      const stored = {
        ...result,
        updatedAt: now,
        createdAt: agreementSnapshot.exists
          ? agreementSnapshot.data()?.createdAt ?? now
          : now,
      };
      transaction.set(agreementRef, stored);
      transaction.create(
        agreementRef.collection('versions').doc(String(version).padStart(6, '0')),
        { ...stored, recordedAt: now },
      );
      transaction.update(orderRef, {
        agreementStatus: 'pending',
        updatedAt: now,
      });
      eventType = agreementSnapshot.exists ? 'agreement_revised' : 'agreement_proposed';
      createNotification(transaction, {
        userId: command.actorId === order.customerId ? order.selectedMasterId! : order.customerId,
        type: 'agreement_pending',
        title: 'Новая версия условий',
        body: 'Проверьте цену, срок, мерки и доставку',
        orderId: command.orderId,
        now,
      });
    } else {
      if (!agreementSnapshot.exists) {
        throw new DomainError('INVALID_STATE', 'Сначала предложите итоговые условия');
      }
      const agreement = agreementSnapshot.data() ?? {};
      if (agreement.status === 'confirmed') {
        throw new DomainError('INVALID_STATE', 'Условия уже подтверждены');
      }
      const currentConfirmations = confirmationsFromData(agreement.confirmations);
      const confirmation = decideAgreementConfirmation(order, command.actorId, currentConfirmations);
      const version = numberValue(agreement.version);
      const confirmedAt = confirmation.fullyConfirmed ? now : undefined;
      transaction.update(agreementRef, {
        confirmations: confirmation.confirmations,
        status: confirmation.fullyConfirmed ? 'confirmed' : 'pending',
        ...(confirmedAt ? { confirmedAt } : {}),
        updatedAt: now,
      });
      transaction.update(
        agreementRef.collection('versions').doc(String(version).padStart(6, '0')),
        {
          confirmations: confirmation.confirmations,
          status: confirmation.fullyConfirmed ? 'confirmed' : 'pending',
          ...(confirmedAt ? { confirmedAt } : {}),
          updatedAt: now,
        },
      );
      if (confirmation.fullyConfirmed) {
        transaction.update(orderRef, {
          agreementStatus: 'confirmed',
          agreementVersion: version,
          finalPrice: numberValue(agreement.finalPrice),
          status: 'awaiting_payment',
          updatedAt: now,
        });
        for (const userId of [order.customerId, order.selectedMasterId!]) {
          createNotification(transaction, {
            userId,
            type: 'agreement_confirmed',
            title: 'Условия согласованы',
            body: 'Итоговая версия зафиксирована и ожидает тестовой оплаты',
            orderId: command.orderId,
            now,
          });
        }
      } else {
        createNotification(transaction, {
          userId: command.actorId === order.customerId ? order.selectedMasterId! : order.customerId,
          type: 'agreement_pending',
          title: 'Условия ждут вашего подтверждения',
          body: 'Вторая сторона уже подтвердила текущую версию',
          orderId: command.orderId,
          now,
        });
      }
      result = agreementDto({
        ...agreement,
        confirmations: confirmation.confirmations,
        status: confirmation.fullyConfirmed ? 'confirmed' : 'pending',
        ...(confirmedAt ? { confirmedAt } : {}),
        updatedAt: now,
      });
      eventType = confirmation.fullyConfirmed ? 'agreement_confirmed' : 'agreement_party_confirmed';
    }

    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'agreement',
      aggregateId: command.orderId,
      eventType,
      actorId: command.actorId,
      commandId: command.commandId,
      payload: { version: result.version },
      createdAt: now,
    });
    transaction.create(receiptRef, {
      commandType: `agreement_${command.action}`,
      actorId: command.actorId,
      result,
      createdAt: now,
    });
    return result;
  });
}

export async function getAgreementForActorFromFirestore(
  orderId: string,
  actorId: string,
): Promise<AgreementDto | null> {
  const [orderSnapshot, agreementSnapshot] = await Promise.all([
    adminDb.collection('orders').doc(orderId).get(),
    adminDb.collection('agreements').doc(orderId).get(),
  ]);
  if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
  const order = orderSnapshotFromData(orderSnapshot.id, orderSnapshot.data() ?? {});
  if (actorId !== order.customerId && actorId !== order.selectedMasterId) {
    throw new DomainError('FORBIDDEN', 'Условия доступны только участникам заказа');
  }
  return agreementSnapshot.exists ? agreementDto(agreementSnapshot.data() ?? {}) : null;
}

function orderSnapshotFromData(id: string, data: Record<string, unknown>): AgreementOrderSnapshot {
  const deliveryOption = data.deliveryOption === 'local'
    || data.deliveryOption === 'delivery'
    || data.deliveryOption === 'both'
    ? data.deliveryOption
    : undefined;
  return {
    id,
    customerId: String(data.customerId ?? ''),
    selectedMasterId: typeof data.selectedMasterId === 'string' ? data.selectedMasterId : undefined,
    status: String(data.status ?? ''),
    description: String(data.description ?? ''),
    measurements: String(data.measurements ?? ''),
    photos: stringArray(data.photos),
    selectedPrice: typeof data.selectedPrice === 'number' ? data.selectedPrice : undefined,
    deliveryOption,
  };
}

function agreementDto(data: Record<string, unknown>): AgreementDto {
  const deliveryMethod = data.deliveryMethod === 'delivery' ? 'delivery' : 'local';
  return {
    orderId: String(data.orderId ?? ''),
    version: numberValue(data.version),
    status: data.status === 'confirmed' ? 'confirmed' : 'pending',
    description: String(data.description ?? ''),
    measurements: String(data.measurements ?? ''),
    referencePhotos: stringArray(data.referencePhotos),
    finalPrice: numberValue(data.finalPrice),
    deadline: String(data.deadline ?? ''),
    deliveryMethod,
    deliveryIncluded: data.deliveryIncluded === true,
    ...(typeof data.tolerances === 'string' && data.tolerances ? { tolerances: data.tolerances } : {}),
    cancellationPolicyVersion: String(data.cancellationPolicyVersion ?? ''),
    confirmations: confirmationsFromData(data.confirmations),
    proposedBy: String(data.proposedBy ?? ''),
    updatedAt: timestampIso(data.updatedAt),
    ...(data.confirmedAt instanceof Timestamp ? { confirmedAt: timestampIso(data.confirmedAt) } : {}),
  };
}

function confirmationsFromData(value: unknown): AgreementConfirmations {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { customer: record.customer === true, master: record.master === true };
}

function createNotification(
  transaction: Transaction,
  input: { userId: string; type: string; title: string; body: string; orderId: string; now: Timestamp },
): void {
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

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function timestampIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}
