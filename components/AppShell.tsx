'use client';

import dynamic from 'next/dynamic';

// AuthProvider imports Firebase which is browser-only.
// dynamic({ ssr: false }) ensures Firebase never initializes in Node.js
// (which would cause Firestore to report "client is offline" during SSR).
const AuthProvider = dynamic(
  () => import('@/hooks/useAuth').then((m) => ({ default: m.AuthProvider })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFF8F0',
          gap: 16,
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

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div id="app-root">{children}</div>
    </AuthProvider>
  );
}
