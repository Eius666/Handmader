import { NextRequest, NextResponse } from 'next/server';
import { resolveDisputeInFirestore } from '@/modules/disputes/infrastructure/firestore/disputes';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';
import { requireStaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';

export async function POST(request: NextRequest, context: { params: Promise<{ disputeId: string }> }) {
  try {
    const staff = await requireStaffActor(request.headers.get('authorization'), ['admin']);
    const { disputeId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    const result = await resolveDisputeInFirestore({
      disputeId, staff, commandId: body.commandId, resolution: body.resolution, decisionSummary: body.decisionSummary,
      customerRefundAmountMinor: body.customerRefundAmountMinor, masterPayoutAmountMinor: body.masterPayoutAmountMinor, platformFeeAmountMinor: body.platformFeeAmountMinor,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) { return domainErrorResponse(error); }
}
