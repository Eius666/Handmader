import 'server-only';

import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminDb } from '@/modules/shared/infrastructure/firebase/admin';
import { createPublicAlias } from '../../domain/public-alias';
import {
  parseMasterProfile,
  parseUserRole,
  parseVerificationApplication,
} from '../../domain/profile';

export type ProfileCommandAction =
  | 'initialize'
  | 'set_role'
  | 'update_master_profile'
  | 'submit_verification'
  | 'link_telegram';

export interface ProfileCommand {
  actorId: string;
  actorEmail?: string;
  actorDisplayName?: string;
  action: ProfileCommandAction;
  payload: unknown;
  commandId: string;
}

export interface PrivateProfileDto {
  uid: string;
  email: string;
  displayName: string;
  role: 'customer' | 'master' | 'both' | null;
  hasSelectedRole: boolean;
  createdAt: string;
  masterProfile?: {
    bio: string;
    categories: string[];
    portfolioPhotos: string[];
    rating: number;
    ratingCount?: number;
    completedOrders: number;
    location?: string;
  };
  telegramId?: number;
  verificationStatus?: string;
  verificationSubmittedAt?: string;
  verificationRejectionReason?: string;
  verificationExperience?: string;
  verificationSocialLinks?: string[];
  verificationPortfolioPhotos?: string[];
}

export async function getPrivateProfileFromFirestore(actorId: string): Promise<PrivateProfileDto | null> {
  const userRef = adminDb.collection('users').doc(actorId);
  const publicRef = adminDb.collection('publicProfiles').doc(actorId);
  const [snapshot, publicSnapshot] = await Promise.all([userRef.get(), publicRef.get()]);
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  if (!publicSnapshot.exists) {
    await publicRef.set(basePublicProfile(actorId, data, {}, Timestamp.now()), { merge: true });
  }
  return privateProfileDto(actorId, data);
}

export async function executeProfileCommandInFirestore(
  command: ProfileCommand,
): Promise<PrivateProfileDto> {
  const userRef = adminDb.collection('users').doc(command.actorId);
  const publicRef = adminDb.collection('publicProfiles').doc(command.actorId);
  const receiptRef = userRef.collection('commandReceipts').doc(command.commandId);

  return adminDb.runTransaction(async (transaction) => {
    const receipt = await transaction.get(receiptRef);
    if (receipt.exists) return receipt.data()?.result as PrivateProfileDto;

    const userSnapshot = await transaction.get(userRef);
    const existing = userSnapshot.data() ?? {};
    const now = Timestamp.now();

    if (!userSnapshot.exists && command.action !== 'initialize') {
      throw new DomainError('NOT_FOUND', 'Профиль пользователя не найден');
    }

    let privateUpdate: Record<string, unknown> = { updatedAt: now };
    let publicUpdate: Record<string, unknown> = { updatedAt: now };

    switch (command.action) {
      case 'initialize': {
        if (!userSnapshot.exists) {
          privateUpdate = {
            uid: command.actorId,
            email: command.actorEmail ?? '',
            displayName: command.actorDisplayName ?? '',
            role: null,
            hasSelectedRole: false,
            createdAt: now,
            updatedAt: now,
          };
        }
        publicUpdate = basePublicProfile(command.actorId, existing, privateUpdate, now);
        break;
      }
      case 'set_role': {
        const role = parseUserRole((command.payload as Record<string, unknown> | null)?.role);
        privateUpdate = { role, hasSelectedRole: true, updatedAt: now };
        publicUpdate = { role, updatedAt: now };
        break;
      }
      case 'update_master_profile': {
        const currentRole = existing.role;
        if (currentRole !== 'master' && currentRole !== 'both') {
          throw new DomainError('FORBIDDEN', 'Профиль мастера недоступен для выбранной роли');
        }
        const editable = parseMasterProfile(command.payload);
        const currentMaster = asRecord(existing.masterProfile);
        const masterProfile = {
          ...editable,
          portfolioPhotos: [],
          rating: numberOrZero(currentMaster.rating),
          ratingCount: numberOrZero(currentMaster.ratingCount),
          completedOrders: numberOrZero(currentMaster.completedOrders),
        };
        privateUpdate = { masterProfile, updatedAt: now };
        publicUpdate = {
          alias: createPublicAlias('master', command.actorId),
          city: editable.location,
          categories: editable.categories,
          rating: masterProfile.rating,
          ratingCount: masterProfile.ratingCount,
          completedOrders: masterProfile.completedOrders,
          updatedAt: now,
        };
        break;
      }
      case 'submit_verification': {
        if (existing.verificationStatus === 'pending') {
          throw new DomainError('INVALID_STATE', 'Заявка уже находится на рассмотрении');
        }
        const application = parseVerificationApplication(command.payload);
        privateUpdate = {
          verificationStatus: 'pending',
          verificationSubmittedAt: now,
          verificationRejectionReason: FieldValue.delete(),
          verificationExperience: application.experience,
          verificationSocialLinks: application.socialLinks,
          verificationPortfolioPhotos: application.portfolioPhotos,
          updatedAt: now,
        };
        break;
      }
      case 'link_telegram': {
        const telegramId = (command.payload as Record<string, unknown> | null)?.telegramId;
        if (typeof telegramId !== 'number' || !Number.isSafeInteger(telegramId) || telegramId <= 0) {
          throw new DomainError('VALIDATION_ERROR', 'Некорректный Telegram ID');
        }
        privateUpdate = { telegramId, updatedAt: now };
        break;
      }
    }

    if (userSnapshot.exists) transaction.set(userRef, privateUpdate, { merge: true });
    else transaction.create(userRef, privateUpdate);
    transaction.set(publicRef, publicUpdate, { merge: true });

    const merged = applyPrivateUpdate(existing, privateUpdate);
    const result = privateProfileDto(command.actorId, merged);
    transaction.create(receiptRef, {
      commandType: `profile.${command.action}`,
      result,
      createdAt: now,
    });
    transaction.create(adminDb.collection('auditEvents').doc(), {
      aggregateType: 'user',
      aggregateId: command.actorId,
      eventType: `profile_${command.action}`,
      actorId: command.actorId,
      commandId: command.commandId,
      createdAt: now,
    });

    return result;
  });
}

function basePublicProfile(
  userId: string,
  existing: Record<string, unknown>,
  update: Record<string, unknown>,
  now: Timestamp,
) {
  const role = update.role ?? existing.role ?? null;
  const master = asRecord(existing.masterProfile);
  return {
    uid: userId,
    customerAlias: createPublicAlias('customer', userId),
    masterAlias: createPublicAlias('master', userId),
    role,
    verified: existing.verificationStatus === 'verified',
    city: stringOrEmpty(master.location),
    categories: Array.isArray(master.categories)
      ? master.categories.filter((item): item is string => typeof item === 'string')
      : [],
    rating: numberOrZero(master.rating),
    ratingCount: numberOrZero(master.ratingCount),
    completedOrders: numberOrZero(master.completedOrders),
    createdAt: existing.createdAt instanceof Timestamp ? existing.createdAt : now,
    updatedAt: now,
  };
}

function privateProfileDto(uid: string, data: Record<string, unknown>): PrivateProfileDto {
  const master = asRecord(data.masterProfile);
  const role = data.role === 'customer' || data.role === 'master' || data.role === 'both'
    ? data.role
    : null;
  const result: PrivateProfileDto = {
    uid,
    email: stringOrEmpty(data.email),
    displayName: stringOrEmpty(data.displayName),
    role,
    // Legacy profiles predate hasSelectedRole; an existing role is the
    // authoritative signal that onboarding was already completed.
    hasSelectedRole: data.hasSelectedRole === true || role !== null,
    createdAt: timestampIso(data.createdAt),
  };

  if (Object.keys(master).length > 0) {
    result.masterProfile = {
      bio: stringOrEmpty(master.bio),
      categories: Array.isArray(master.categories)
        ? master.categories.filter((item): item is string => typeof item === 'string')
        : [],
      portfolioPhotos: [],
      rating: numberOrZero(master.rating),
      ratingCount: numberOrZero(master.ratingCount),
      completedOrders: numberOrZero(master.completedOrders),
      location: stringOrEmpty(master.location),
    };
  }
  if (typeof data.telegramId === 'number') result.telegramId = data.telegramId;
  if (typeof data.verificationStatus === 'string') result.verificationStatus = data.verificationStatus;
  if (data.verificationSubmittedAt) result.verificationSubmittedAt = timestampIso(data.verificationSubmittedAt);
  if (typeof data.verificationRejectionReason === 'string') {
    result.verificationRejectionReason = data.verificationRejectionReason;
  }
  if (typeof data.verificationExperience === 'string') result.verificationExperience = data.verificationExperience;
  if (Array.isArray(data.verificationSocialLinks)) {
    result.verificationSocialLinks = data.verificationSocialLinks.filter((item): item is string => typeof item === 'string');
  }
  if (Array.isArray(data.verificationPortfolioPhotos)) {
    result.verificationPortfolioPhotos = data.verificationPortfolioPhotos.filter((item): item is string => typeof item === 'string');
  }
  return result;
}

function applyPrivateUpdate(
  existing: Record<string, unknown>,
  update: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...existing, ...update };
  if (update.verificationRejectionReason instanceof FieldValue) {
    delete merged.verificationRejectionReason;
  }
  return merged;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function timestampIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : new Date(0).toISOString();
}
