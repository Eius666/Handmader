import { NextRequest, NextResponse } from 'next/server';

import { requireFirebaseActor } from '@/modules/identity/infrastructure/firebase-auth';
import { listPublishedReviewsForSubjectFromFirestore } from '@/modules/reviews/infrastructure/firestore/reviews';
import { DomainError } from '@/modules/shared/domain/domain-error';
import { domainErrorResponse } from '@/modules/shared/http/domain-error-response';

export async function GET(request: NextRequest) {
  try {
    await requireFirebaseActor(request.headers.get('authorization'));
    const subjectId = request.nextUrl.searchParams.get('subjectId');
    if (!subjectId || subjectId.length > 128 || subjectId.includes('/')) {
      throw new DomainError('VALIDATION_ERROR', 'Некорректный профиль для отзывов');
    }
    const result = await listPublishedReviewsForSubjectFromFirestore(subjectId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return domainErrorResponse(error);
  }
}
