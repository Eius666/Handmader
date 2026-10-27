import { NextRequest, NextResponse } from 'next/server';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { type OrderTransitionAction } from '@/modules/orders/domain/transition-order';
import { transitionOrderInFirestore } from '@/modules/orders/infrastructure/firestore/transition-order';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

const ACTIONS = new Set<OrderTransitionAction>([
  'start_work',
  'mark_ready',
  'confirm_delivery',
]);

interface RequestBody {
  action?: unknown;
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

    if (typeof body.action !== 'string' || !ACTIONS.has(body.action as OrderTransitionAction)) {
      throw new DomainError('VALIDATION_ERROR', 'Неизвестное действие с заказом');
    }
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    }

    const result = await transitionOrderInFirestore({
      orderId,
      actorId: actor.uid,
      action: body.action as OrderTransitionAction,
      commandId: body.commandId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
