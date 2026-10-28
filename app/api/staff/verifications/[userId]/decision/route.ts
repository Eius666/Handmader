import { NextRequest, NextResponse } from 'next/server';

import { requireStaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';
import { decideVerificationInFirestore } from '@/modules/users/infrastructure/firestore/verification-admin';

interface RequestBody {
  decision?: unknown;
  reason?: unknown;
  commandId?: unknown;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const staff = await requireStaffActor(request.headers.get('authorization'), ['admin']);
    const { userId } = await context.params;
    const body = await request.json() as RequestBody;
    if (body.decision !== 'approve' && body.decision !== 'reject') {
      throw new DomainError('VALIDATION_ERROR', 'Некорректное решение');
    }
    if (body.reason !== undefined && typeof body.reason !== 'string') {
      throw new DomainError('VALIDATION_ERROR', 'Некорректная причина решения');
    }
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    }
    const result = await decideVerificationInFirestore({
      userId,
      staff,
      decision: body.decision,
      reason: body.reason,
      commandId: body.commandId,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
