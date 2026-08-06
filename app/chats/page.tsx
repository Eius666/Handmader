'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { SkeletonChatItem } from '@/components/ui/Skeleton';
import { getChatList } from '@/lib/firestore';
import { Chat } from '@/types';

function formatTime(date: Date): string {
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'вчера';
  return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

export default function ChatsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [chats, setChats]   = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getChatList(user.uid)
      .then(setChats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <PageLayout title="Чаты">
      {loading ? (
        <div className="flex flex-col pt-1">
          {[0, 1, 2, 3].map((i) => <SkeletonChatItem key={i} />)}
        </div>
      ) : chats.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-8 py-24 text-center">
          <span className="text-5xl">💬</span>
          <p className="text-[14px] font-semibold text-muted-foreground">Чатов пока нет</p>
          <p className="text-[12px] text-muted-foreground">
            Чат появится после того, как клиент выберет мастера для заказа
          </p>
        </div>
      ) : (
        <div className="flex flex-col pt-1">
          {chats.map((chat, idx) => {
            const isCustomer = user?.uid === chat.customerId;
            const otherName  = isCustomer
              ? (chat.masterName   || 'Мастер')
              : (chat.customerName || 'Клиент');
            const unread = isCustomer ? chat.unreadCustomer : chat.unreadMaster;

            return (
              <button
                key={chat.orderId}
                type="button"
                onClick={() => router.push(`/chat/${chat.orderId}`)}
                className="stagger-item flex w-full items-center gap-3 px-5 py-3.5 text-left transition-all active:bg-secondary"
                style={{
                  borderBottom:   '1px solid rgb(var(--foreground-rgb) / 0.06)',
                  animationDelay: `${idx * 50}ms`,
                }}
              >
                {/* Avatar */}
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #d96c52, #f2a47e)' }}
                  aria-hidden="true"
                >
                  {otherName[0]?.toUpperCase() ?? '?'}
                </div>

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[14px] font-bold text-foreground">
                      {otherName}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] text-muted-foreground">
                      {chat.lastMessage || '…'}
                    </span>
                    {unread > 0 && (
                      <span
                        className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{
                          background: 'var(--primary)',
                          minWidth: 20,
                          height: 20,
                          padding: '0 5px',
                        }}
                      >
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
