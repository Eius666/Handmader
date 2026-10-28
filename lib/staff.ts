'use client';

import { getServerQuery, postServerCommand } from './serverCommand';

export type StaffRole = 'support' | 'admin';

export interface StaffActorDto {
  uid: string;
  email?: string;
  role: StaffRole;
}

export interface VerificationApplicationDto {
  userId: string;
  email: string;
  displayName: string;
  experience: string;
  socialLinks: string[];
  evidencePhotos: string[];
  submittedAt: string;
}

export function getStaffActor(): Promise<StaffActorDto> {
  return getServerQuery<StaffActorDto>('/api/staff/me');
}

export function getPendingVerifications(): Promise<VerificationApplicationDto[]> {
  return getServerQuery<VerificationApplicationDto[]>('/api/staff/verifications');
}

export function decideVerification(
  userId: string,
  decision: 'approve' | 'reject',
  reason?: string,
): Promise<{ userId: string; status: 'verified' | 'rejected'; reason?: string }> {
  return postServerCommand(
    `/api/staff/verifications/${encodeURIComponent(userId)}/decision`,
    { decision, reason, commandId: crypto.randomUUID() },
  );
}
