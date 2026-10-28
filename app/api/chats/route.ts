import { NextRequest, NextResponse } from 'next/server';

import { listChatsForActorFromFirestore } from '@/modules/chat/infrastructure/firestore/read-chat';
import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const chats = await listChatsForActorFromFirestore(actor.uid);
    return NextResponse.json({ success: true, data: chats });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
