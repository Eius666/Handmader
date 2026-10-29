import { NextRequest, NextResponse } from 'next/server';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { reconfirmProposalInFirestore } from '@/modules/proposals/infrastructure/firestore/reconfirm-proposal';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

interface RequestBody {
  commandId?: unknown;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    const body = await request.json() as RequestBody;
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    }
    const result = await reconfirmProposalInFirestore({
      orderId,
      actorId: actor.uid,
      commandId: body.commandId,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
