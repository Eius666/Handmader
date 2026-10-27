import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { createPublicAlias } from '@/modules/users/domain/public-alias';
import { decideReviewSubmission } from '../../domain/submit-review';

export interface SubmitReviewCommand {
  orderId: string;
  actorId: string;
  commandId: string;
  rating: unknown;
  comment?: unknown;
}

export interface SubmitReviewResult {
  reviewId: string;
  orderId: string;
  publishAt: string;
  repeated: boolean;
}

export interface PublishedReviewDto {
  id: string;
  orderId: string;
  authorAlias: string;
  authorRole: 'customer' | 'master';
  rating: number;
  comment?: string;
  publishedAt: string;
}

export interface PublishedReviewSummary {
  rating: number;
  ratingCount: number;
  reviews: PublishedReviewDto[];
}

export async function submitReviewInFirestore(
  command: SubmitReviewCommand,
): Promise<SubmitReviewResult> {
  const orderRef = adminDb.collection('orders').doc(command.orderId);
  const reviewId = `${command.orderId}_${command.actorId}`;
  const reviewRef = adminDb.collection('reviews').doc(reviewId);
  const receiptRef = orderRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const [receiptSnapshot, reviewSnapshot, orderSnapshot] = await Promise.all([
      transaction.get(receiptRef),
      transaction.get(reviewRef),
      transaction.get(orderRef),
    ]);
    if (receiptSnapshot.exists) {
      const stored = receiptSnapshot.data()?.result as SubmitReviewResult | undefined;
      if (!stored) throw new DomainError('INVALID_STATE', 'Повтор команды не содержит результат');
      return { ...stored, repeated: true };
    }
    if (reviewSnapshot.exists) {
      throw new DomainError('INVALID_STATE', 'Вы уже оставили отзыв об этом заказе');
    }
    if (!orderSnapshot.exists) throw new DomainError('NOT_FOUND', 'Заказ не найден');

    const data = orderSnapshot.data() ?? {};
    const completionTimestamp = data.completedAt instanceof Timestamp
      ? data.completedAt
      : data.deliveredAt instanceof Timestamp
        ? data.deliveredAt
        : undefined;
    const decision = decideReviewSubmission({
      id: orderSnapshot.id,
      customerId: String(data.customerId ?? ''),
      selectedMasterId: typeof data.selectedMasterId === 'string' ? data.selectedMasterId : undefined,
      status: String(data.status ?? ''),
      completedAt: completionTimestamp?.toDate(),
    }, command.actorId, {
      rating: command.rating,
      comment: command.comment,
    });

    const now = Timestamp.now();
    const publishAt = Timestamp.fromDate(decision.publishAt);
    const result: SubmitReviewResult = {
      reviewId,
      orderId: command.orderId,
      publishAt: decision.publishAt.toISOString(),
      repeated: false,
    };

    transaction.create(reviewRef, {
      ...decision,
      publishAt,
      createdAt: now,
      updatedAt: now,
    });
    transaction.update(orderRef, {
      reviewAuthorIds: FieldValue.arrayUnion(command.actorId),
      updatedAt: now,
    });
    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'review',
      aggregateId: reviewId,
      eventType: 'review_submitted',
      actorId: command.actorId,
      commandId: command.commandId,
      payload: {
        orderId: command.orderId,
        subjectId: decision.subjectId,
        publishAt,
      },
      createdAt: now,
    });
    transaction.create(adminDb.collection('outboxEvents').doc(), {
      type: 'review.publication_due',
      aggregateId: reviewId,
      payload: {
        orderId: command.orderId,
        subjectId: decision.subjectId,
      },
      availableAt: publishAt,
      status: 'pending',
      attempts: 0,
      createdAt: now,
    });
    transaction.create(receiptRef, {
      commandType: 'submit_review',
      actorId: command.actorId,
      result,
      createdAt: now,
    });
    return result;
  });
}

export async function listPublishedReviewsForSubjectFromFirestore(
  subjectId: string,
  limitCount = 50,
): Promise<PublishedReviewSummary> {
  const snapshot = await adminDb.collection('reviews')
    .where('subjectId', '==', subjectId)
    .where('publishAt', '<=', Timestamp.now())
    .orderBy('publishAt', 'desc')
    .limit(Math.min(Math.max(limitCount, 1), 100))
    .get();

  const reviews = snapshot.docs.map((document): PublishedReviewDto => {
    const data = document.data();
    const authorRole = data.authorRole === 'master' ? 'master' : 'customer';
    return {
      id: document.id,
      orderId: String(data.orderId ?? ''),
      authorAlias: createPublicAlias(authorRole, String(data.authorId ?? '')),
      authorRole,
      rating: typeof data.rating === 'number' ? data.rating : 0,
      ...(typeof data.comment === 'string' && data.comment ? { comment: data.comment } : {}),
      publishedAt: timestampIso(data.publishAt),
    };
  });
  const ratingCount = reviews.length;
  const rating = ratingCount > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount
    : 0;
  return { rating, ratingCount, reviews };
}

function timestampIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}
