'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
        <header
          className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-5"
          style={{ borderBottom: '1px solid rgba(180,100,70,0.08)' }}
        >
          {showBack && !webApp && (
            <button
              onClick={onBack ?? (() => router.back())}
              aria-label="Назад"
              className="flex size-9 items-center justify-center rounded-full text-foreground transition-all duration-200 active:scale-95"
              style={{ background: 'rgba(217,108,82,0.08)' }}
            >
              <ArrowLeft className="size-4 text-primary" />
            </button>
          )}
          <h1
            className="flex-1 text-[19px] font-bold tracking-[-0.02em] text-foreground"
            style={{ margin: 0 }}
          >
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
