import { NextRequest, NextResponse } from 'next/server';

import { autoAcceptDueDeliveriesInFirestore } from '@/modules/delivery/infrastructure/firestore/deliveries';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ success: true, data: await autoAcceptDueDeliveriesInFirestore() });
}
