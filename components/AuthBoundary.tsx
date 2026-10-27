'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { isProtectedRoute } from '@/modules/identity/domain/protected-route';

export function AuthBoundary({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const protectedRoute = isProtectedRoute(pathname);

  useEffect(() => {
    if (!loading && !user && protectedRoute) {
      router.replace('/auth/login');
    }
  }, [loading, protectedRoute, router, user]);

  if (loading || (!user && protectedRoute)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background" role="status" aria-live="polite">
        <span className="size-10 animate-spin rounded-full border-2 border-secondary border-t-primary" aria-hidden="true" />
        <p className="text-sm font-semibold text-muted-foreground">
          {loading ? 'Проверяем сессию…' : 'Переходим ко входу…'}
        </p>
      </div>
    );
  }

  return children;
}
