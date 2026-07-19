'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/notifications';
import { relativeTime } from '@/lib/relativeTime';
import { AppNotification, NotificationType } from '@/types';

function notifIcon(type: NotificationType): string {
  switch (type) {
    case 'new_order':              return '🧵';
    case 'new_response':           return '📨';
    case 'master_selected':        return '✅';
    case 'work_started':           return '🔧';
    case 'order_ready':            return '✨';
    case 'order_completed':        return '🎉';
    case 'new_message':            return '💬';
    case 'verification_approved':  return '⭐';
    case 'verification_rejected':  return '⭐';
    default:                       return '🔔';
  }
}

function NotificationSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-5 pt-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-2xl p-4"
          style={{ background: '#FFFDF9', boxShadow: 'var(--shadow-card)', opacity: 1 - i * 0.15 }}
        >
          <div className="size-10 shrink-0 rounded-full" style={{ background: 'rgba(194,112,62,0.10)' }} />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3.5 w-2/3 rounded-full" style={{ background: 'rgba(194,112,62,0.10)' }} />
            <div className="h-3 w-full rounded-full" style={{ background: 'rgba(194,112,62,0.06)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading,        setLoading]       = useState(true);
  const [markingAll,     setMarkingAll]    = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, (items) => {
      setNotifications(items);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  async function handleMarkAll() {
    if (!user?.uid || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(user.uid);
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleTap(notif: AppNotification) {
    if (!notif.read) {
      markNotificationRead(notif.id).catch(console.error);
    }
    if (notif.chatId) {
      router.push(`/chat/${notif.chatId}`);
    } else if (notif.orderId) {
      router.push(`/track/${notif.orderId}`);
    }
  }

  const hasUnread = notifications.some((n) => !n.read);

  const headerRight = hasUnread ? (
    <button
      onClick={handleMarkAll}
      disabled={markingAll}
      className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all active:scale-95 disabled:opacity-50"
      style={{ background: 'rgba(194,112,62,0.08)', color: '#C2703E' }}
    >
      {markingAll ? '...' : 'Прочитать все'}
    </button>
  ) : undefined;

  return (
    <PageLayout title="Уведомления" showBack headerRight={headerRight}>
      {loading ? (
        <NotificationSkeleton />
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-5 pt-20 text-center">
          <div
            className="flex size-20 items-center justify-center rounded-full"
            style={{ background: 'rgba(194,112,62,0.08)' }}
          >
            <Bell size={36} strokeWidth={1.4} style={{ color: '#C2703E' }} />
          </div>
          <p className="text-[15px] font-semibold text-foreground">Пока нет уведомлений</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Здесь будут появляться уведомления о заказах, откликах и сообщениях
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-5 pb-8 pt-4">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              onClick={() => handleTap(notif)}
              className="flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-all duration-150 active:scale-[0.985]"
              style={{
                background:    notif.read ? '#FFFDF9' : 'rgba(194,112,62,0.05)',
                boxShadow:     'var(--shadow-card)',
                border:        notif.read ? 'none' : '1px solid rgba(194,112,62,0.12)',
              }}
            >
              {/* Unread dot */}
              <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-[20px]"
                style={{ background: 'rgba(194,112,62,0.08)' }}
              >
                {notifIcon(notif.type)}
                {!notif.read && (
                  <span
                    className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full"
                    style={{ background: '#C2703E', border: '1.5px solid #F8F2EA' }}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="truncate text-[13px] text-foreground"
                    style={{ fontWeight: notif.read ? 500 : 700 }}
                  >
                    {notif.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {relativeTime(notif.createdAt)}
                  </span>
                </div>
                <span className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                  {notif.body}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
