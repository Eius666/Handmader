import { NextRequest, NextResponse } from 'next/server';

import { getDeliveryFromFirestore, startDeliveryInFirestore, confirmReceiptInFirestore, acceptDeliveryInFirestore } from '@/modules/delivery/infrastructure/firestore/deliveries';
import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    return NextResponse.json({ success: true, data: await getDeliveryFromFirestore(orderId, actor.uid) });
  } catch (error) { return domainErrorResponse(error); }
}

export async function POST(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    const command = { orderId, actorId: actor.uid, commandId: body.commandId };
    let result;
    if (body.action === 'start') result = await startDeliveryInFirestore({ ...command, carrier: body.carrier, trackingNumber: body.trackingNumber });
    else if (body.action === 'confirm_receipt') result = await confirmReceiptInFirestore(command);
    else if (body.action === 'accept') result = await acceptDeliveryInFirestore(command);
    else throw new DomainError('VALIDATION_ERROR', 'Неизвестное действие с доставкой');
    return NextResponse.json({ success: true, data: result });
  } catch (error) { return domainErrorResponse(error); }
}
