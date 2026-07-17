'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { SplashScreen } from './SplashScreen';

// AuthProvider and OnboardingGate both import Firebase — ssr: false prevents Node.js init.
const AuthProvider = dynamic(
  () => import('@/hooks/useAuth').then((m) => ({ default: m.AuthProvider })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height:         '100%',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          background:     '#FFF8F0',
          gap:            16,
        }}
      >
        <div style={{ fontSize: 56 }}>🧶</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#E07A5F', margin: 0 }}>
          Handmader
        </h1>
      </div>
    ),
  }
);

const OnboardingGate = dynamic(() => import('./OnboardingGate'), { ssr: false });

export function AppShell({ children }: { children: React.ReactNode }) {
  const [splash, setSplash] = useState(false);

  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    if (wa) { wa.ready(); wa.expand(); }

    // Check after mount to avoid SSR hydration mismatch
    if (!localStorage.getItem('handmader_splash_seen')) {
      setSplash(true);
    }
  }, []);

  return (
    <>
      <AuthProvider>
        <OnboardingGate>
          <div id="app-root">{children}</div>
        </OnboardingGate>
      </AuthProvider>

      {splash && <SplashScreen onDone={() => setSplash(false)} />}
    </>
  );
}
