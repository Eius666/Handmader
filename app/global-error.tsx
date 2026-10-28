'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global] rendering failed', error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#F8F4EE', color: '#342922', textAlign: 'center' }}>
          <section style={{ width: '100%', maxWidth: 420, padding: 28, borderRadius: 24, background: '#FFFFFF' }}>
            <div aria-hidden="true" style={{ fontSize: 40 }}>🧶</div>
            <h1 style={{ margin: '16px 0 8px', fontSize: 24 }}>Приложение временно недоступно</h1>
            <p style={{ margin: '0 0 20px', lineHeight: 1.5, color: '#766960' }}>
              Обновите приложение. Ваши данные и действия не потеряны.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ width: '100%', border: 0, borderRadius: 14, padding: '14px 18px', background: '#9B5134', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
            >
              Повторить
            </button>
            {error.digest && <p style={{ marginTop: 16, fontSize: 11, color: '#766960' }}>Код: {error.digest}</p>}
          </section>
        </main>
      </body>
    </html>
  );
}
