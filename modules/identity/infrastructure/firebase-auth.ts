import 'server-only';

import { DomainError } from '@/modules/shared/domain/domain-error';
import { adminAuth } from '@/modules/shared/infrastructure/firebase/admin';

export interface AuthenticatedActor {
  uid: string;
  email?: string;
  displayName?: string;
}

export async function requireFirebaseActor(
  authorizationHeader: string | null,
): Promise<AuthenticatedActor> {
  const [scheme, token] = authorizationHeader?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    throw new DomainError('FORBIDDEN', 'Требуется авторизация');
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email : undefined,
      displayName: typeof decoded.name === 'string' ? decoded.name : undefined,
    };
  } catch (error) {
    const details = error && typeof error === 'object'
      ? error as { code?: unknown; message?: unknown }
      : {};
    console.error('[identity] Firebase ID token verification failed', {
      code: typeof details.code === 'string' ? details.code : 'unknown',
      message: typeof details.message === 'string' ? details.message : 'unknown',
      configuredProjectId: process.env.FIREBASE_PROJECT_ID
        ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        ?? 'missing',
    });
    throw new DomainError('FORBIDDEN', 'Сессия недействительна или истекла');
  }
}
