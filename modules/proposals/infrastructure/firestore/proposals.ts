import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { createPublicAlias } from '@/modules/users/domain/public-alias';
import { canMasterDiscoverOrder } from '@/modules/orders/domain/order-access';
import { decideProposalSubmission } from '../../domain/submit-proposal';

export interface SubmitProposalCommand {
  orderId: string;
  actorId: string;
  price: number;
  timeline: string;
  comment: string;
  commandId: string;
}

export interface ProposalDto {
  masterId: string;
  masterName: string;
  masterRating: number;
  masterCompletedOrders: number;
  masterVerified: boolean;
  price: number;
  timeline: string;
  comment: string;
  portfolioPhotos: [];
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  validUntil: string;
  reconfirmationDeadline?: string;
}

interface StoredProposal {
  masterId?: unknown;
  masterAlias?: unknown;
  masterRating?: unknown;
  masterCompletedOrders?: unknown;
  masterVerified?: unknown;
  price?: unknown;
  timeline?: unknown;
  comment?: unknown;
  version?: unknown;
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  validUntil?: unknown;
  confirmedReselectionCycle?: unknown;
}

interface ProposalProjectionContext {
  reselectionCycle: number;
  excludedMasterIds: string[];
  reconfirmationDeadline?: Timestamp;
}

export async function submitProposalInFirestore(
  command: SubmitProposalCommand,
): Promise<ProposalDto> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const userRef = adminDb.collection('users').doc(command.actorId);
  const publicProfileRef = adminDb.collection('publicProfiles').doc(command.actorId);
  const proposalRef = orderRef.collection('proposals').doc(command.actorId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const receiptSnapshot = await transaction.get(receiptRef);
    if (receiptSnapshot.exists) return receiptSnapshot.data()?.result as ProposalDto;

    const orderSnapshot = await transaction.get(orderRef);
    const userSnapshot = await transaction.get(userRef);
    const publicProfileSnapshot = await transaction.get(publicProfileRef);
    const proposalSnapshot = await transaction.get(proposalRef);

    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');
    if (!userSnapshot.exists) throw new DomainError('FORBIDDEN', 'Профиль мастера не найден');

    const order = orderSnapshot.data() ?? {};
    const user = userSnapshot.data() ?? {};
    const existing = proposalSnapshot.data() as StoredProposal | undefined;
    const privateMasterProfile = (user.masterProfile ?? {}) as Record<string, unknown>;
    const publicMasterProfile = (publicProfileSnapshot.data() ?? {}) as Record<string, unknown>;
    const visibilityProfile = publicProfileSnapshot.exists ? publicMasterProfile : privateMasterProfile;
    const deliveryOption = order.deliveryOption === 'local'
      || order.deliveryOption === 'delivery'
      || order.deliveryOption === 'both'
      ? order.deliveryOption
      : undefined;
    if (!proposalSnapshot.exists && !canMasterDiscoverOrder({
      customerId: String(order.customerId ?? ''),
      selectedMasterId: typeof order.selectedMasterId === 'string' ? order.selectedMasterId : undefined,
      status: String(order.status ?? ''),
      category: String(order.category ?? ''),
      location: typeof order.location === 'string' ? order.location : undefined,
      deliveryOption,
      excludedMasterIds: stringArray(order.excludedMasterIds),
    }, {
      id: command.actorId,
      role: user.role,
      categories: Array.isArray(visibilityProfile.categories)
        ? visibilityProfile.categories.filter((item): item is string => typeof item === 'string')
        : [],
      city: typeof visibilityProfile.city === 'string'
        ? visibilityProfile.city
        : typeof visibilityProfile.location === 'string'
          ? visibilityProfile.location
          : undefined,
      verified: publicProfileSnapshot.exists
        ? visibilityProfile.verified === true
        : user.verificationStatus === 'verified',
    })) {
      throw new DomainError('FORBIDDEN', 'Этот заказ недоступен для отклика');
    }
    const decision = decideProposalSubmission({
      id: orderSnapshot.id,
      customerId: String(order.customerId ?? ''),
      status: String(order.status ?? ''),
      excludedMasterIds: stringArray(order.excludedMasterIds),
    }, {
      id: command.actorId,
      role: typeof user.role === 'string' ? user.role : null,
    }, {
      price: command.price,
      timeline: command.timeline,
      comment: command.comment,
    }, typeof existing?.version === 'number' ? existing.version : 0, new Date());

    const now = Timestamp.now();
    const createdAt = proposalSnapshot.exists && existing?.createdAt instanceof Timestamp
      ? existing.createdAt
      : now;
    const masterProfile = visibilityProfile;
    const stored = {
      masterId: command.actorId,
      masterAlias: createPublicAlias('master', command.actorId),
      masterRating: typeof masterProfile.rating === 'number' ? masterProfile.rating : 0,
      masterCompletedOrders: typeof masterProfile.completedOrders === 'number'
        ? masterProfile.completedOrders
        : 0,
      masterVerified: publicProfileSnapshot.exists
        ? masterProfile.verified === true
        : user.verificationStatus === 'verified',
      price: decision.price,
      timeline: decision.timeline,
      comment: decision.comment,
      version: decision.version,
      status: decision.status,
      createdAt,
      updatedAt: now,
      validUntil: Timestamp.fromDate(decision.validUntil),
      confirmedReselectionCycle: typeof order.reselectionCycle === 'number'
        ? order.reselectionCycle
        : 0,
    };

    transaction.set(proposalRef, stored);
    transaction.create(
      proposalRef.collection('versions').doc(String(decision.version).padStart(6, '0')),
      { ...stored, recordedAt: now },
    );
    transaction.update(orderRef, {
      responseCount: proposalSnapshot.exists
        ? FieldValue.increment(0)
        : FieldValue.increment(1),
      updatedAt: now,
    });

    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'proposal',
      aggregateId: `${command.orderId}:${command.actorId}`,
      eventType: proposalSnapshot.exists ? 'proposal_revised' : 'proposal_created',
      actorId: command.actorId,
      commandId: command.commandId,
      payload: { orderId: command.orderId, version: decision.version },
      createdAt: now,
    });

    transaction.create(adminDb.collection('notifications').doc(), {
      userId: String(order.customerId),
      type: 'new_response',
      title: proposalSnapshot.exists ? 'Отклик обновлён' : 'Новый отклик',
      body: `${createPublicAlias('master', command.actorId)} предложил ${decision.price.toLocaleString('ru-RU')} ₽`,
      orderId: command.orderId,
      read: false,
      createdAt: now,
      createdBy: 'system',
    });

    const result = proposalDto(stored);
    transaction.create(receiptRef, {
      commandType: 'submit_proposal',
      result,
      createdAt: FieldValue.serverTimestamp(),
    });

    return result;
  });
}

export async function getVisibleProposalsFromFirestore(
  orderId: string,
  actorId: string,
): Promise<ProposalDto[]> {
  const orderRef = adminDb.collection('orders').doc(orderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');

  const order = orderSnapshot.data() ?? {};
  const context = proposalProjectionContext(order);
  const isCustomer = order.customerId === actorId;
  const proposals: ProposalDto[] = [];

  if (isCustomer) {
    const snapshot = await orderRef.collection('proposals').get();
    snapshot.docs.forEach((item) => proposals.push(proposalDto(item.data() as StoredProposal, context)));
  } else {
    const own = await orderRef.collection('proposals').doc(actorId).get();
    if (own.exists) proposals.push(proposalDto(own.data() as StoredProposal, context));
  }

  if (proposals.length > 0) {
    return proposals.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  // Compatibility projection for orders created before proposal extraction.
  const legacy = (order.responses ?? {}) as Record<string, Record<string, unknown>>;
  const visibleLegacy = isCustomer
    ? Object.entries(legacy)
    : Object.entries(legacy).filter(([masterId]) => masterId === actorId);

  return visibleLegacy.map(([masterId, value]) => legacyProposalDto(masterId, value, context));
}

export async function getMyProposalsFromFirestore(actorId: string) {
  const snapshot = await adminDb.collectionGroup('proposals')
    .where('masterId', '==', actorId)
    .get();

  const rows = await Promise.all(snapshot.docs.map(async (proposalSnapshot) => {
    const orderRef = proposalSnapshot.ref.parent.parent;
    if (!orderRef) return null;
    const orderSnapshot = await orderRef.get();
    if (!orderSnapshot.exists) return null;
    const order = orderSnapshot.data() ?? {};

    return {
      proposal: proposalDto(
        proposalSnapshot.data() as StoredProposal,
        proposalProjectionContext(order),
      ),
      order: {
        id: orderSnapshot.id,
        description: String(order.description ?? ''),
        category: String(order.category ?? 'other'),
        status: String(order.status ?? ''),
        selectedMasterId: typeof order.selectedMasterId === 'string'
          ? order.selectedMasterId
          : undefined,
        createdAt: timestampIso(order.createdAt),
      },
    };
  }));

  return rows
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((left, right) => right.order.createdAt.localeCompare(left.order.createdAt));
}

function proposalDto(
  value: StoredProposal,
  context: ProposalProjectionContext = { reselectionCycle: 0, excludedMasterIds: [] },
): ProposalDto {
  const masterId = String(value.masterId ?? '');
  const confirmedCycle = typeof value.confirmedReselectionCycle === 'number'
    ? value.confirmedReselectionCycle
    : 0;
  const status = context.excludedMasterIds.includes(masterId)
    ? 'excluded'
    : confirmedCycle < context.reselectionCycle
      ? 'reconfirmation_required'
      : String(value.status ?? 'active');
  return {
    masterId,
    masterName: String(value.masterAlias ?? 'Мастер'),
    masterRating: numberOrZero(value.masterRating),
    masterCompletedOrders: numberOrZero(value.masterCompletedOrders),
    masterVerified: value.masterVerified === true,
    price: numberOrZero(value.price),
    timeline: String(value.timeline ?? ''),
    comment: String(value.comment ?? ''),
    portfolioPhotos: [],
    version: numberOrZero(value.version),
    status,
    createdAt: timestampIso(value.createdAt),
    updatedAt: timestampIso(value.updatedAt),
    validUntil: timestampIso(value.validUntil),
    ...(status === 'reconfirmation_required' && context.reconfirmationDeadline
      ? { reconfirmationDeadline: timestampIso(context.reconfirmationDeadline) }
      : {}),
  };
}

function legacyProposalDto(
  masterId: string,
  value: Record<string, unknown>,
  context: ProposalProjectionContext,
): ProposalDto {
  const createdAt = timestampIso(value.createdAt);
  return {
    masterId,
    masterName: createPublicAlias('master', masterId),
    masterRating: numberOrZero(value.masterRating),
    masterCompletedOrders: numberOrZero(value.masterCompletedOrders),
    masterVerified: value.masterVerified === true,
    price: numberOrZero(value.price),
    timeline: String(value.timeline ?? ''),
    comment: String(value.comment ?? ''),
    portfolioPhotos: [],
    version: 1,
    status: context.excludedMasterIds.includes(masterId)
      ? 'excluded'
      : context.reselectionCycle > 0
        ? 'reconfirmation_required'
        : 'active',
    createdAt,
    updatedAt: createdAt,
    validUntil: '',
    ...(context.reselectionCycle > 0 && context.reconfirmationDeadline
      ? { reconfirmationDeadline: timestampIso(context.reconfirmationDeadline) }
      : {}),
  };
}

function proposalProjectionContext(order: Record<string, unknown>): ProposalProjectionContext {
  return {
    reselectionCycle: typeof order.reselectionCycle === 'number' ? order.reselectionCycle : 0,
    excludedMasterIds: stringArray(order.excludedMasterIds),
    reconfirmationDeadline: order.reconfirmationDeadline instanceof Timestamp
      ? order.reconfirmationDeadline
      : undefined,
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function timestampIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date(0).toISOString();
}
