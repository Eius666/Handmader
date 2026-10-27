import { NextResponse } from 'next/server';

import { DomainError } from '@/modules/shared/domain/domain-error';

const STATUS_BY_CODE = {
  FORBIDDEN: 403,
  INVALID_STATE: 409,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
} as const;

export function domainErrorResponse(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: STATUS_BY_CODE[error.code] },
    );
  }

  console.error('[api] unhandled error', error);
  return NextResponse.json(
    { success: false, error: 'Внутренняя ошибка сервера', code: 'INTERNAL_ERROR' },
    { status: 500 },
  );
}
