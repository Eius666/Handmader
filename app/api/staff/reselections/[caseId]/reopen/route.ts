import { NextRequest, NextResponse } from 'next/server';

import { reopenSelectionInFirestore } from '@/modules/orders/infrastructure/firestore/reselection';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';
import { requireStaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';

interface RequestBody {
  commandId?: unknown;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const staff = await requireStaffActor(request.headers.get('authorization'));
    const { caseId } = await context.params;
    const body = await request.json() as RequestBody;
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    }
    const result = await reopenSelectionInFirestore({ caseId, staff, commandId: body.commandId });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
