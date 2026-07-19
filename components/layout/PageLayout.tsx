'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useTelegram } from '@/hooks/useTelegram';
import { NotificationBell } from '@/components/ui/NotificationBell';

interface PageLayoutProps {
  children:     ReactNode;
  title?:       string;
  showBack?:    boolean;
  onBack?:      () => void;
  hideNav?:     boolean;
  headerRight?: ReactNode;
}

export function PageLayout({
  children,
  title,
  showBack = false,
  onBack,
  hideNav  = false,
  headerRight,
}: PageLayoutProps) {
  const router     = useRouter();
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
    <div className="flex h-full flex-col overflow-hidden" style={{ background: 'var(--background)' }}>
      {title && (
        <header
          className="shrink-0 flex items-center gap-3 px-5 pb-4 pt-6"
          style={{ borderBottom: '1px solid rgba(194,112,62,0.08)' }}
        >
          {showBack && !webApp && (
            <button
              onClick={onBack ?? (() => router.back())}
              aria-label="Назад"
              className="flex size-9 items-center justify-center rounded-full transition-all duration-200 active:scale-95"
              style={{ background: 'rgba(194,112,62,0.08)', color: '#C2703E' }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
          )}

          <h1
            className="font-display flex-1 leading-tight text-foreground"
            style={{ margin: 0, fontSize: 26, fontWeight: 700 }}
          >
            {title}
          </h1>

          <NotificationBell />
          {headerRight}
        </header>
      )}

      <div
        className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
        style={{ paddingBottom: hideNav ? 0 : 'calc(var(--nav-height) + env(safe-area-inset-bottom))' }}
      >
        <div className="page-enter min-h-full">
          {children}
        </div>
      </div>

      {!hideNav && <BottomNav />}
    </div>
  );
}
