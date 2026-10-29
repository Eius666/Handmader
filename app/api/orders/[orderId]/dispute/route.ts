import { NextRequest, NextResponse } from 'next/server';

import { addDisputeEvidenceInFirestore, getActiveDisputeFromFirestore, openDisputeInFirestore } from '@/modules/disputes/infrastructure/firestore/disputes';
import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    return NextResponse.json({ success: true, data: await getActiveDisputeFromFirestore(orderId, actor.uid) });
  } catch (error) { return domainErrorResponse(error); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    const command = { orderId, actorId: actor.uid, commandId: body.commandId };
    const result = body.action === 'open'
      ? await openDisputeInFirestore({ ...command, reason: body.reason })
      : body.action === 'add_evidence'
        ? await addDisputeEvidenceInFirestore({ ...command, description: body.description, sourceUrl: body.sourceUrl })
        : (() => { throw new DomainError('VALIDATION_ERROR', 'Неизвестное действие со спором'); })();
    return NextResponse.json({ success: true, data: result });
  } catch (error) { return domainErrorResponse(error); }
}
