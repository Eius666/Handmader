'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { setUser } from '@/lib/firestore';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface WebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
  MainButton: {
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
    showProgress: (leaveActive: boolean) => void;
    hideProgress: () => void;
  };
  initDataUnsafe: {
    user?: TelegramUser;
  };
  colorScheme: 'light' | 'dark';
  openTelegramLink: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: WebApp };
  }
}

export function useTelegram() {
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [webApp, setWebApp] = useState<WebApp | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const wa = window.Telegram.WebApp;
      setWebApp(wa);
      const tgUsr = wa.initDataUnsafe?.user ?? null;
      setTgUser(tgUsr);

      // Save Telegram ID to Firestore on first login or when it changes.
      // Checked against auth.currentUser to avoid a read; the actual
      // Firestore setDoc uses merge:true so duplicate writes are cheap.
      if (tgUsr?.id) {
        const fbUser = auth.currentUser;
        if (fbUser) {
          // Store in sessionStorage so we only write once per browser session.
          const sessionKey = `tgid_saved_${fbUser.uid}`;
          if (!sessionStorage.getItem(sessionKey)) {
            setUser(fbUser.uid, { telegramId: tgUsr.id })
              .then(() => sessionStorage.setItem(sessionKey, '1'))
              .catch(console.error);
          }
        }
      }
    }
  }, []);

  function openTelegramChat(telegramId: string | number) {
    const url = `tg://openmessage?user_id=${telegramId}`;
    if (webApp) {
      webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  return { tgUser, webApp, openTelegramChat };
}
