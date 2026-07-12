'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav } from './BottomNav';
import { useTelegram } from '@/hooks/useTelegram';

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  hideNav?: boolean;
  headerRight?: ReactNode;
}

export function PageLayout({
  children,
  title,
  showBack = false,
  onBack,
  hideNav = false,
  headerRight,
}: PageLayoutProps) {
  const router = useRouter();
  const { webApp } = useTelegram();

  useEffect(() => {
    if (!webApp) return;
    if (showBack) {
      const handler = onBack ?? (() => router.back());
      webApp.BackButton.show();
      webApp.BackButton.onClick(handler);
      return () => webApp.BackButton.offClick(handler);
    } else {
      webApp.BackButton.hide();
    }
  }, [showBack, webApp, onBack, router]);

  return (
    <div className="flex h-full flex-col bg-background">
      {title && (
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 pb-3 pt-4">
          {showBack && !webApp && (
            <button
              onClick={onBack ?? (() => router.back())}
              className="text-[22px] leading-none text-primary"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              ←
            </button>
          )}
          <h1 className="flex-1 text-xl font-bold text-foreground" style={{ margin: 0 }}>
            {title}
          </h1>
          {headerRight}
        </header>
      )}

      <div
        className="scrollable flex-1"
        style={{ paddingBottom: hideNav ? 0 : 'calc(var(--nav-height) + env(safe-area-inset-bottom))' }}
      >
        {children}
      </div>

      {!hideNav && <BottomNav />}
    </div>
  );
}
