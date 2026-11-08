import { NextRequest, NextResponse } from 'next/server';
import { changeAmendmentInFirestore, getAmendmentForActorFromFirestore } from '@/modules/amendments/infrastructure/firestore/amendments';
import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try { const actor = await requireFirebaseActor(request.headers.get('authorization')); const { orderId } = await context.params; return NextResponse.json({ success: true, data: await getAmendmentForActorFromFirestore(orderId, actor.uid) }); }
  catch (error) { return domainErrorResponse(error); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization')); const { orderId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    if (body.action !== 'propose' && body.action !== 'confirm') throw new DomainError('VALIDATION_ERROR', 'Неизвестное действие с изменением');
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    const result = await changeAmendmentInFirestore({ orderId, actorId: actor.uid, commandId: body.commandId, action: body.action, ...(body.action === 'propose' ? { input: { description: body.description, measurements: body.measurements, deadline: body.deadline, tolerances: body.tolerances, reason: body.reason } } : {}) });
    return NextResponse.json({ success: true, data: result });
  } catch (error) { return domainErrorResponse(error); }
}
