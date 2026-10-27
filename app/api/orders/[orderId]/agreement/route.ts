import { NextRequest, NextResponse } from 'next/server';

import { changeAgreementInFirestore, getAgreementForActorFromFirestore } from '@/modules/agreements/infrastructure/firestore/agreements';
import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    const agreement = await getAgreementForActorFromFirestore(orderId, actor.uid);
    return NextResponse.json({ success: true, data: agreement });
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
    const body = await request.json() as Record<string, unknown>;
    if (body.action !== 'propose' && body.action !== 'confirm') {
      throw new DomainError('VALIDATION_ERROR', 'Неизвестное действие с условиями');
    }
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    }
    const result = await changeAgreementInFirestore({
      orderId,
      actorId: actor.uid,
      commandId: body.commandId,
      action: body.action,
      ...(body.action === 'propose' ? {
        input: {
          finalPrice: body.finalPrice,
          deadline: body.deadline,
          deliveryMethod: body.deliveryMethod,
          deliveryIncluded: body.deliveryIncluded,
          tolerances: body.tolerances,
        },
      } : {}),
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
