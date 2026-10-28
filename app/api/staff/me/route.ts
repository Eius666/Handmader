import { NextRequest, NextResponse } from 'next/server';

import { requireStaffActor } from '@/modules/staff/infrastructure/firestore/staff-access';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(request: NextRequest) {
  try {
    const staff = await requireStaffActor(request.headers.get('authorization'));
    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
