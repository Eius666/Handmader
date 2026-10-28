import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import type { StaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import {
  decideVerification,
  type VerificationDecision,
} from '../../domain/verification-decision';

export interface VerificationApplicationDto {
  userId: string;
  email: string;
  displayName: string;
  experience: string;
  socialLinks: string[];
  evidencePhotos: string[];
  submittedAt: string;
}

export interface VerificationDecisionCommand {
  userId: string;
  staff: StaffActor;
  decision: VerificationDecision;
  reason?: string;
  commandId: string;
}

export interface VerificationDecisionDto {
  userId: string;
  status: 'verified' | 'rejected';
  reason?: string;
  repeated: boolean;
}

export async function listPendingVerificationsFromFirestore(): Promise<VerificationApplicationDto[]> {
  const snapshot = await adminDb.collection('users')
    .where('verificationStatus', '==', 'pending')
    .limit(100)
    .get();

  return snapshot.docs
    .map((document) => applicationDto(document.id, document.data()))
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
}

export async function decideVerificationInFirestore(
  command: VerificationDecisionCommand,
): Promise<VerificationDecisionDto> {
  const userRef = adminDb.collection('users').doc(command.userId);
  const publicRef = adminDb.collection('publicProfiles').doc(command.userId);
  const receiptRef = userRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const receipt = await transaction.get(receiptRef);
    if (receipt.exists) {
      return { ...(receipt.data()?.result as VerificationDecisionDto), repeated: true };
    }

    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) throw new DomainError('NOT_FOUND', 'Пользователь не найден');
    const user = userSnapshot.data() ?? {};
    const result = decideVerification(
      { userId: command.userId, status: String(user.verificationStatus ?? 'none') },
      command.staff.role,
      command.decision,
      command.reason,
    );
    const now = Timestamp.now();
    const dto: VerificationDecisionDto = {
      userId: command.userId,
      status: result.status,
      ...(result.reason ? { reason: result.reason } : {}),
      repeated: false,
    };

    transaction.update(userRef, {
      verificationStatus: result.status,
      verificationReviewedAt: now,
      verificationReviewedBy: command.staff.uid,
      verificationRejectionReason: result.reason ?? FieldValue.delete(),
    });
    transaction.set(publicRef, {
      verified: result.verified,
      verificationLabel: result.verified
        ? 'Личность и сведения проверены'
        : FieldValue.delete(),
      updatedAt: now,
    }, { merge: true });
    transaction.create(adminDb.collection('notifications').doc(), {
      userId: command.userId,
      type: result.verified ? 'verification_approved' : 'verification_rejected',
      title: result.verified ? 'Профиль верифицирован' : 'Заявка требует исправлений',
      body: result.verified
        ? 'Проверка личности и предоставленных сведений завершена'
        : result.reason,
      read: false,
      createdAt: now,
      createdBy: 'system',
    });
    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'verification',
      aggregateId: command.userId,
      eventType: result.verified ? 'verification_approved' : 'verification_rejected',
      actorId: command.staff.uid,
      actorRole: command.staff.role,
      commandId: command.commandId,
      payload: { reason: result.reason ?? null },
      createdAt: now,
    });
    transaction.create(adminDb.collection('outboxEvents').doc(), {
      type: result.verified ? 'verification.approved' : 'verification.rejected',
      aggregateId: command.userId,
      payload: { userId: command.userId },
      status: 'pending',
      attempts: 0,
      createdAt: now,
    });
    transaction.create(receiptRef, {
      commandType: 'verification_decision',
      actorId: command.staff.uid,
      result: dto,
      createdAt: now,
    });
    return dto;
  });
}

function applicationDto(userId: string, data: Record<string, unknown>): VerificationApplicationDto {
  return {
    userId,
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? ''),
    experience: String(data.verificationExperience ?? ''),
    socialLinks: stringArray(data.verificationSocialLinks),
    evidencePhotos: stringArray(data.verificationPortfolioPhotos),
    submittedAt: timestampIso(data.verificationSubmittedAt),
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function timestampIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}
