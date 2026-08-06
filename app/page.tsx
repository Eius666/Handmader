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
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    // hasSelectedRole: false → stay here; OnboardingRole renders below
    if (!user.hasSelectedRole) return;

    // Deep-link via Telegram startapp param: chat_<orderId>
    const tg = (window as Window & { Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } } });
    const startParam = tg.Telegram?.WebApp?.initDataUnsafe?.start_param ?? '';
    if (startParam.startsWith('chat_')) {
      const chatOrderId = startParam.slice(5);
      if (chatOrderId) {
        router.replace(`/chat/${chatOrderId}`);
        return;
      }
    }

    // Role is set — route by role
    router.replace(user.role === 'master' ? '/feed' : '/home');
  }, [user, loading, router]);

  // Show role-selection onboarding when user is authenticated but hasn't picked a role
  if (user && !user.hasSelectedRole) {
    return <OnboardingRole />;
  }

  // Loading or redirect in progress — show splash
  return (
    <div
      style={{
        height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--background)', gap: 16,
      }}
    >
      <div style={{ fontSize: 56 }}>🧶</div>
      <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
        Handmader
      </h1>
      <Spinner size={28} />
    </div>
  );
}
