'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (user.role === 'master') {
      router.replace('/feed');
    } else {
      router.replace('/home');
    }
  }, [user, loading, router]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 56 }}>🧶</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', margin: 0 }}>
        Handmader
      </h1>
      <Spinner size={28} />
    </div>
  );
}
