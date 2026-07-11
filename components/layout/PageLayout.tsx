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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg)',
      }}
    >
      {title && (
        <header
          style={{
            padding: '16px 20px 12px',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
            borderBottom: '1px solid var(--border)',
          }}
        >
          {showBack && !webApp && (
            <button
              onClick={onBack ?? (() => router.back())}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 22,
                cursor: 'pointer',
                padding: 0,
                color: 'var(--accent)',
              }}
            >
              ←
            </button>
          )}
          <h1
            style={{
              flex: 1,
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text)',
            }}
          >
            {title}
          </h1>
          {headerRight}
        </header>
      )}

      <div
        className="scrollable"
        style={{
          flex: 1,
          paddingBottom: hideNav ? 0 : 'calc(var(--nav-height) + env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </div>

      {!hideNav && <BottomNav />}
    </div>
  );
}
