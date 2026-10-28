import { NextRequest, NextResponse } from 'next/server';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import {
  countUnreadNotificationsForActorFromFirestore,
  listNotificationsForActorFromFirestore,
  markAllNotificationsReadForActorInFirestore,
  markNotificationReadForActorInFirestore,
} from '@/modules/notifications/infrastructure/firestore/notifications';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const mode = request.nextUrl.searchParams.get('mode') ?? 'list';
    if (mode === 'unread') {
      const count = await countUnreadNotificationsForActorFromFirestore(actor.uid);
      return NextResponse.json({ success: true, data: { count } });
    }
    if (mode !== 'list') throw new DomainError('VALIDATION_ERROR', 'Некорректный режим уведомлений');
    const notifications = await listNotificationsForActorFromFirestore(actor.uid);
    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    return domainErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const body = await request.json() as Record<string, unknown>;
    if (body.action === 'mark_all_read') {
      await markAllNotificationsReadForActorInFirestore(actor.uid);
    } else if (body.action === 'mark_read') {
      if (typeof body.notificationId !== 'string'
        || body.notificationId.length < 1
        || body.notificationId.length > 128
        || body.notificationId.includes('/')) {
        throw new DomainError('VALIDATION_ERROR', 'Некорректное уведомление');
      }
      await markNotificationReadForActorInFirestore(actor.uid, body.notificationId);
    } else {
      throw new DomainError('VALIDATION_ERROR', 'Неизвестное действие с уведомлениями');
    }
    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
