import { DomainError } from '../../shared/domain/domain-error.ts';
import type { StaffRole } from '../../staff/domain/staff-role.ts';

export type VerificationDecision = 'approve' | 'reject';

export interface VerificationApplicationSnapshot {
  userId: string;
  status: string;
}

export interface VerificationDecisionResult {
  status: 'verified' | 'rejected';
  verified: boolean;
  reason?: string;
}

export function decideVerification(
  application: VerificationApplicationSnapshot,
  staffRole: StaffRole,
  decision: VerificationDecision,
  reason: unknown,
): VerificationDecisionResult {
  if (staffRole !== 'admin') {
    throw new DomainError('FORBIDDEN', 'Решение по верификации принимает администратор');
  }
  if (application.status !== 'pending') {
    throw new DomainError('INVALID_STATE', 'Заявка уже рассмотрена или не отправлена');
  }
  if (decision === 'approve') return { status: 'verified', verified: true };
  if (decision !== 'reject') {
    throw new DomainError('VALIDATION_ERROR', 'Некорректное решение по заявке');
  }
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 1_000) {
    throw new DomainError('VALIDATION_ERROR', 'Укажите причину отказа от 5 до 1000 символов');
  }
  return { status: 'rejected', verified: false, reason: reason.trim() };
}
