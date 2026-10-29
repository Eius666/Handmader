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

export interface ReselectionCaseDto {
  id: string;
  orderId: string;
  orderTitle: string;
  orderStatus: string;
  customerAlias: string;
  previousMasterAlias: string;
  reason: string;
  requestedAt: string;
}

export interface StaffDisputeDto {
  id: string; orderId: string; status: 'open' | 'resolved'; openedByAlias: string; reason: string; createdAt: string;
  evidence: Array<{ id: string; authorAlias: string; description: string; sourceUrl?: string; createdAt: string }>;
  orderTitle: string; orderStatus: string; customerAlias: string; masterAlias: string; grossAmountMinor: number;
  suggestedMasterAmountMinor: number; suggestedPlatformFeeAmountMinor: number;
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

export function getPendingReselections(): Promise<ReselectionCaseDto[]> {
  return getServerQuery<ReselectionCaseDto[]>('/api/staff/reselections');
}

export function reopenMasterSelection(
  caseId: string,
): Promise<{ orderId: string; status: 'awaiting_responses'; reconfirmationDeadline: string }> {
  return postServerCommand(
    `/api/staff/reselections/${encodeURIComponent(caseId)}/reopen`,
    { commandId: crypto.randomUUID() },
  );
}

export function getOpenDisputes(): Promise<StaffDisputeDto[]> {
  return getServerQuery<StaffDisputeDto[]>('/api/staff/disputes');
}

export function resolveDispute(disputeId: string, input: {
  resolution: 'accept_order' | 'full_refund' | 'partial_refund'; decisionSummary: string;
  customerRefundAmountMinor: number; masterPayoutAmountMinor: number; platformFeeAmountMinor: number;
}) {
  return postServerCommand(`/api/staff/disputes/${encodeURIComponent(disputeId)}/resolve`, { ...input, commandId: crypto.randomUUID() });
}
