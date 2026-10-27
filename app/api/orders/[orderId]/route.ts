import { NextRequest, NextResponse } from 'next/server';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { getOrderForActorFromFirestore } from '@/modules/orders/infrastructure/firestore/read-orders';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    const order = await getOrderForActorFromFirestore(orderId, actor.uid);
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
