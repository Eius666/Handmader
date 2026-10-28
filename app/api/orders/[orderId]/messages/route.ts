import { NextRequest, NextResponse } from 'next/server';

import { sendMessageInFirestore } from '@/modules/chat/infrastructure/firestore/send-message';
import {
  listMessagesForActorFromFirestore,
  markMessagesReadForActorInFirestore,
} from '@/modules/chat/infrastructure/firestore/read-chat';
import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

interface RequestBody {
  action?: unknown;
  text?: unknown;
  commandId?: unknown;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const { orderId } = await context.params;
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
    const messages = await listMessagesForActorFromFirestore(
      orderId,
      actor.uid,
      Number.isFinite(requestedLimit) ? requestedLimit : 50,
    );
    return NextResponse.json({ success: true, data: messages });
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
    const body = await request.json() as RequestBody;

    if (body.action === 'mark_read') {
      await markMessagesReadForActorInFirestore(orderId, actor.uid);
      return NextResponse.json({ success: true, data: { updated: true } });
    }

    if (typeof body.text !== 'string') {
      throw new DomainError('VALIDATION_ERROR', 'Некорректное сообщение');
    }
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    }

    const result = await sendMessageInFirestore({
      orderId,
      actorId: actor.uid,
      text: body.text,
      commandId: body.commandId,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
