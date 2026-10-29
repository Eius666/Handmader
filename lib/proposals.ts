'use client';

import { getServerQuery, postServerCommand } from './serverCommand';
import type { OrderCategory, OrderResponse, OrderStatus } from '@/types';

interface ProposalWire extends Omit<OrderResponse, 'createdAt' | 'updatedAt' | 'validUntil' | 'reconfirmationDeadline'> {
  createdAt: string;
  updatedAt: string;
  validUntil: string;
  reconfirmationDeadline?: string;
}

export interface MyProposalRow {
  proposal: OrderResponse;
  order: {
    id: string;
    description: string;
    category: OrderCategory;
    status: OrderStatus;
    selectedMasterId?: string;
    createdAt: Date;
  };
}

interface MyProposalWire {
  proposal: ProposalWire;
  order: Omit<MyProposalRow['order'], 'createdAt'> & { createdAt: string };
}

export async function submitProposal(
  orderId: string,
  draft: { price: number; timeline: string; comment: string },
): Promise<OrderResponse> {
  const proposal = await postServerCommand<ProposalWire>(
    `/api/orders/${encodeURIComponent(orderId)}/proposals`,
    { ...draft, commandId: crypto.randomUUID() },
  );
  return mapProposal(proposal);
}

export async function getVisibleProposals(
  orderId: string,
): Promise<Record<string, OrderResponse>> {
  const proposals = await getServerQuery<ProposalWire[]>(
    `/api/orders/${encodeURIComponent(orderId)}/proposals`,
  );
  return Object.fromEntries(proposals.map((proposal) => [
    proposal.masterId,
    mapProposal(proposal),
  ]));
}

export async function getMyProposals(): Promise<MyProposalRow[]> {
  const rows = await getServerQuery<MyProposalWire[]>('/api/proposals/mine');
  return rows.map((row) => ({
    proposal: mapProposal(row.proposal),
    order: {
      ...row.order,
      createdAt: parseDate(row.order.createdAt),
    },
  }));
}

export async function reconfirmProposal(orderId: string): Promise<void> {
  await postServerCommand(`/api/orders/${encodeURIComponent(orderId)}/proposals/reconfirm`, {
    commandId: crypto.randomUUID(),
  });
}

function mapProposal(proposal: ProposalWire): OrderResponse {
  return {
    ...proposal,
    createdAt: parseDate(proposal.createdAt),
    updatedAt: parseDate(proposal.updatedAt),
    validUntil: proposal.validUntil ? parseDate(proposal.validUntil) : undefined,
    reconfirmationDeadline: proposal.reconfirmationDeadline
      ? parseDate(proposal.reconfirmationDeadline)
      : undefined,
  };
}

function parseDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}
