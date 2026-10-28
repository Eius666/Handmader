import { NextRequest, NextResponse } from 'next/server';

import { requireStaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';
import { listPendingVerificationsFromFirestore } from '@/modules/users/infrastructure/firestore/verification-admin';

export async function GET(request: NextRequest) {
  try {
    await requireStaffActor(request.headers.get('authorization'));
    const applications = await listPendingVerificationsFromFirestore();
    return NextResponse.json({ success: true, data: applications });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
