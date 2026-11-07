import { NextRequest, NextResponse } from 'next/server';
import { executeTestSettlementInFirestore } from '@/modules/payments/infrastructure/firestore/settlements';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';
import { requireStaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';

export async function POST(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const staff = await requireStaffActor(request.headers.get('authorization'), ['admin']);
    const { orderId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    return NextResponse.json({ success: true, data: await executeTestSettlementInFirestore({ orderId, staff, commandId: body.commandId }) });
  } catch (error) { return domainErrorResponse(error); }
}
