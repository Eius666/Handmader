'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Onboarding } from './Onboarding';

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (user && !localStorage.getItem('handmader_onboarded')) {
      setShow(true);
    }
  }, [user]);

  return (
    <>
      {children}
      {show && <Onboarding onDone={() => setShow(false)} />}
    </>
  );
}
