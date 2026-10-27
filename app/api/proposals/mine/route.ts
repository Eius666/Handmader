import { NextRequest, NextResponse } from 'next/server';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { getMyProposalsFromFirestore } from '@/modules/proposals/infrastructure/firestore/proposals';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireFirebaseActor(request.headers.get('authorization'));
    const rows = await getMyProposalsFromFirestore(actor.uid);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
