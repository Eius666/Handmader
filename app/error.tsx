'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { PressableButton } from '@/components/motion/Pressable';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[route] rendering failed', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12 text-center">
      <section className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-card p-7 shadow-[var(--shadow-card)]">
        <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-3xl" aria-hidden="true">
          ↻
        </div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Не удалось открыть экран</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Попробуйте ещё раз. Если ошибка повторяется, вернитесь на главную.
        </p>
        <div className="mt-2 flex w-full gap-3">
          <PressableButton type="button" onClick={() => router.replace('/home')} className="btn-outline flex-1 px-4 py-3">
            На главную
          </PressableButton>
          <PressableButton type="button" onClick={reset} className="btn-primary flex-1 px-4 py-3">
            Повторить
          </PressableButton>
        </div>
        {error.digest && <p className="text-[10px] text-muted-foreground">Код: {error.digest}</p>}
      </section>
    </main>
  );
}
