import { NextRequest, NextResponse } from 'next/server';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { createOrderInFirestore } from '@/modules/orders/infrastructure/firestore/create-order';
import { listOrdersForActorFromFirestore } from '@/modules/orders/infrastructure/firestore/read-orders';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function POST(request: NextRequest) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    }
    const result = await createOrderInFirestore({
      actorId: actor.uid,
      commandId: body.commandId,
      input: {
        title: body.title,
        description: body.description,
        category: body.category,
        photos: body.photos,
        budgetMin: body.budgetMin,
        budgetMax: body.budgetMax,
        deadline: body.deadline,
        measurements: body.measurements,
        location: body.location,
        deliveryOption: body.deliveryOption,
      },
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return domainErrorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const scope = request.nextUrl.searchParams.get('scope');
    if (scope !== 'mine' && scope !== 'feed') {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный список заказов');
    }
    const orders = await listOrdersForActorFromFirestore(actor.uid, scope);
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
