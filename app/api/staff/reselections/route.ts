import { NextRequest, NextResponse } from 'next/server';

import { listPendingReselectionCasesFromFirestore } from '@/modules/orders/infrastructure/firestore/reselection';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';
import { requireStaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';

export async function GET(request: NextRequest) {
  try {
    await requireStaffActor(request.headers.get('authorization'));
    const cases = await listPendingReselectionCasesFromFirestore();
    return NextResponse.json({ success: true, data: cases });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
