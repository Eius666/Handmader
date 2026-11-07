import { NextRequest, NextResponse } from 'next/server';
import { listPendingSettlementsFromFirestore } from '@/modules/payments/infrastructure/firestore/settlements';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';
import { requireStaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';

export async function GET(request: NextRequest) {
  try {
    await requireStaffActor(request.headers.get('authorization'));
    return NextResponse.json({ success: true, data: await listPendingSettlementsFromFirestore() });
  } catch (error) { return domainErrorResponse(error); }
}
