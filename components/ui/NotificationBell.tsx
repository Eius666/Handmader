'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToUnreadCount } from '@/lib/notifications';
import { PressableButton } from '@/components/motion/Pressable';

export function NotificationBell() {
  const { user }  = useAuth();
  const router    = useRouter();

  const [unreadCount, setUnreadCount] = useState(0);
  const [ring,        setRing]        = useState(0);

  useEffect(() => {
    if (!user?.uid) { setUnreadCount(0); return; }
    const unsub = subscribeToUnreadCount(user.uid, (count) => {
      setUnreadCount((prev) => {
        if (count > prev) setRing((r) => r + 1);
        return count;
      });
    });
    return unsub;
  }, [user?.uid]);

  if (!user) return null;

  return (
    <PressableButton
      onClick={() => router.push('/notifications')}
      aria-label="Уведомления"
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full"
      style={{ background: 'rgb(var(--primary-rgb) / 8%)', color: 'var(--primary)' }}
    >
      <motion.div
        key={ring}
        animate={ring > 0 ? { rotate: [0, -16, 13, -9, 5, 0] } : {}}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
      >
        <Bell size={17} aria-hidden="true" />
      </motion.div>
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            key="badge"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ type: 'spring', stiffness: 460, damping: 22 }}
            className="absolute -right-0.5 -top-0.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full px-1"
            style={{ background: 'var(--danger)', color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </PressableButton>
  );
}
