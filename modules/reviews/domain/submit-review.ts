import { DomainError } from '../../shared/domain/domain-error.ts';

export const REVIEW_PUBLICATION_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export interface ReviewableOrderSnapshot {
  id: string;
  customerId: string;
  selectedMasterId?: string;
  status: string;
  completedAt?: Date;
}

export interface SubmitReviewInput {
  rating: unknown;
  comment?: unknown;
}

export interface ReviewDecision {
  orderId: string;
  authorId: string;
  subjectId: string;
  authorRole: 'customer' | 'master';
  subjectRole: 'customer' | 'master';
  rating: number;
  comment?: string;
  publishAt: Date;
}

export function decideReviewSubmission(
  order: ReviewableOrderSnapshot,
  actorId: string,
  input: SubmitReviewInput,
): ReviewDecision {
  if (order.status !== 'completed') {
    throw new DomainError('INVALID_STATE', 'Отзыв можно оставить только после завершения заказа');
  }
  if (!order.selectedMasterId) {
    throw new DomainError('INVALID_STATE', 'Для заказа не выбран мастер');
  }
  if (!order.completedAt || Number.isNaN(order.completedAt.getTime())) {
    throw new DomainError('INVALID_STATE', 'Не удалось определить дату завершения заказа');
  }

  const isCustomer = actorId === order.customerId;
  const isMaster = actorId === order.selectedMasterId;
  if (!isCustomer && !isMaster) {
    throw new DomainError('FORBIDDEN', 'Отзыв могут оставить только участники заказа');
  }

  if (typeof input.rating !== 'number'
    || !Number.isInteger(input.rating)
    || input.rating < 1
    || input.rating > 5) {
    throw new DomainError('VALIDATION_ERROR', 'Оценка должна быть целым числом от 1 до 5');
  }

  if (input.comment !== undefined && typeof input.comment !== 'string') {
    throw new DomainError('VALIDATION_ERROR', 'Некорректный текст отзыва');
  }
  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
  if (comment.length > 1000) {
    throw new DomainError('VALIDATION_ERROR', 'Отзыв не может быть длиннее 1000 символов');
  }

  return {
    orderId: order.id,
    authorId: actorId,
    subjectId: isCustomer ? order.selectedMasterId : order.customerId,
    authorRole: isCustomer ? 'customer' : 'master',
    subjectRole: isCustomer ? 'master' : 'customer',
    rating: input.rating,
    ...(comment ? { comment } : {}),
    publishAt: new Date(order.completedAt.getTime() + REVIEW_PUBLICATION_DELAY_MS),
  };
}
