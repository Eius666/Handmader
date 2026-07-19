'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToUnreadCount } from '@/lib/notifications';

export function NotificationBell() {
  const { user }  = useAuth();
  const router    = useRouter();

  const [unreadCount, setUnreadCount] = useState(0);
  const [bounce,      setBounce]      = useState(false);

  useEffect(() => {
    if (!user?.uid) { setUnreadCount(0); return; }
    const unsub = subscribeToUnreadCount(user.uid, (count) => {
      setUnreadCount((prev) => {
        if (count > prev) {
          setBounce(true);
          setTimeout(() => setBounce(false), 600);
        }
        return count;
      });
    });
    return unsub;
  }, [user?.uid]);

  if (!user) return null;

  return (
    <button
      onClick={() => router.push('/notifications')}
      aria-label="Уведомления"
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95"
      style={{ background: 'rgba(194,112,62,0.08)', color: '#C2703E' }}
    >
      <Bell size={17} aria-hidden="true" />
      {unreadCount > 0 && (
        <span
          className={`absolute -right-0.5 -top-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full px-1 text-white transition-transform${bounce ? ' animate-bounce' : ''}`}
          style={{ background: '#C83030', fontSize: 11, fontWeight: 700, lineHeight: 1 }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
