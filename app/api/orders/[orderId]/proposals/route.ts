import { NextRequest, NextResponse } from 'next/server';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import {
  getVisibleProposalsFromFirestore,
  submitProposalInFirestore,
} from '@/modules/proposals/infrastructure/firestore/proposals';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

interface SubmitBody {
  price?: unknown;
  timeline?: unknown;
  comment?: unknown;
  commandId?: unknown;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    const proposals = await getVisibleProposalsFromFirestore(orderId, actor.uid);
    return NextResponse.json({ success: true, data: proposals });
  } catch (error) {
    return domainErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    const body = await request.json() as SubmitBody;

    if (typeof body.price !== 'number' || typeof body.timeline !== 'string') {
      throw new DomainError('VALIDATION_ERROR', 'Некорректные данные отклика');
    }
    if (body.comment !== undefined && typeof body.comment !== 'string') {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный комментарий');
    }
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    }

    const proposal = await submitProposalInFirestore({
      orderId,
      actorId: actor.uid,
      price: body.price,
      timeline: body.timeline,
      comment: body.comment ?? '',
      commandId: body.commandId,
    });
    return NextResponse.json({ success: true, data: proposal });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
