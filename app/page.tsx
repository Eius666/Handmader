'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { OnboardingRole } from '@/components/OnboardingRole';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/auth/login'); return; }
    // hasSelectedRole === false → stay on this page, OnboardingRole renders below
    if (user.hasSelectedRole === false) return;
    if (user.role === 'master') { router.replace('/feed'); }
    else { router.replace('/home'); }
  }, [user, loading, router]);

  // Show onboarding fullscreen when user exists but hasn't picked a role yet
  if (!loading && user && user.hasSelectedRole === false) {
    return <OnboardingRole />;
  }

  // Splash / loading / redirect in progress
  return (
    <div
      style={{
        height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', gap: 16,
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
