import { NextRequest, NextResponse } from 'next/server';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';
import {
  executeProfileCommandInFirestore,
  getPrivateProfileFromFirestore,
  type ProfileCommandAction,
} from '@/modules/users/infrastructure/firestore/profile';

const ACTIONS: ProfileCommandAction[] = [
  'initialize',
  'set_role',
  'update_master_profile',
  'submit_verification',
  'link_telegram',
];

export async function GET(request: NextRequest) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const profile = await getPrivateProfileFromFirestore(actor.uid);
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    return domainErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.action !== 'string' || !ACTIONS.includes(body.action as ProfileCommandAction)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректное действие с профилем');
    }
    if (typeof body.commandId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.commandId)) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный идентификатор команды');
    }

    const profile = await executeProfileCommandInFirestore({
      actorId: actor.uid,
      actorEmail: actor.email,
      actorDisplayName: actor.displayName,
      action: body.action as ProfileCommandAction,
      payload: body.payload ?? {},
      commandId: body.commandId,
    });
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
