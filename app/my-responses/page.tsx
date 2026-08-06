'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { MessageSquare } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/layout/BottomNav';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { MotionCard, PressableButton } from '@/components/motion/Pressable';
import { PageTransition } from '@/components/motion/PageTransition';
import { Order, CATEGORY_LABELS } from '@/types';

interface Entry {
  order: Order;
  myPrice: number;
  myTimeline: string;
  isSelected: boolean;
}

function formatDate(s: string) {
  try { return new Date(s).toLocaleDateString('ru', { day: 'numeric', month: 'long' }); }
  catch { return s; }
}

export default function MyResponsesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'customer') { setLoading(false); return; }
    async function load() {
      try {
        const snap = await getDocs(
          query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
        );
        const result: Entry[] = [];
        for (const d of snap.docs) {
          const data = d.data();
          const responses = data.responses as Record<string, { price: number; timeline: string }> | undefined;
          if (responses && user!.uid in responses) {
            const r = responses[user!.uid];
            result.push({
              order: { ...data, id: d.id, createdAt: data.createdAt?.toDate() ?? new Date() } as Order,
              myPrice: r.price,
              myTimeline: r.timeline,
              isSelected: data.selectedMasterId === user!.uid,
            });
          }
        }
        setEntries(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  return (
    <main className="flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="shrink-0 flex items-center justify-between px-5 pb-3 pt-8">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-0.5">Мои</p>
          <h1 className="font-display text-[26px] font-semibold tracking-[-0.02em] text-foreground leading-none">Отклики</h1>
        </div>
        <NotificationBell />
      </header>

      <div className="flex-1 overflow-y-auto pb-28 [&::-webkit-scrollbar]:hidden">
      <PageTransition>
      <section className="flex flex-col gap-3 px-5 pt-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="size-8 rounded-full border-2 border-secondary border-t-primary animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl py-14 text-center"
            style={{ background: 'var(--card)', border: '1px solid rgb(var(--foreground-rgb) / 0.08)', boxShadow: 'var(--shadow-card)' }}
          >
            <span className="text-5xl">📩</span>
            <p className="text-[14px] font-semibold text-muted-foreground">Откликов пока нет</p>
            <p className="text-[12px] text-muted-foreground">Перейдите в ленту и откликнитесь</p>
            <PressableButton
              onClick={() => router.push('/feed')}
              className="mt-2 rounded-full px-6 py-2.5 text-[13px] font-bold text-white"
              style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-primary)' }}
            >
              Открыть ленту
            </PressableButton>
          </div>
        ) : (
          <Stagger className="contents">
          {entries.map(({ order, myPrice, myTimeline, isSelected }) => {
            const isRejected = order.status === 'master_selected' && !isSelected;
            return (
              <StaggerItem key={order.id}>
              <MotionCard
                interactive={false}
                className="flex flex-col gap-3 w-full"
                style={{
                  borderRadius: 18,
                  padding: '14px 16px',
                  background: isSelected
                    ? 'rgb(var(--success-rgb) / 7%)'
                    : isRejected
                    ? 'rgb(var(--foreground-rgb) / 4%)'
                    : 'var(--card)',
                  border: isSelected
                    ? '1px solid rgb(var(--success-rgb) / 20%)'
                    : isRejected
                    ? '1px solid rgb(var(--foreground-rgb) / 12%)'
                    : '1px solid rgb(var(--foreground-rgb) / 0.08)',
                  boxShadow: 'var(--shadow-sm)',
                  opacity: isRejected ? 0.6 : 1,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    isSelected
                      ? router.push(`/track/${order.id}`)
                      : router.push(`/orders/${order.id}`)
                  }
                  className="flex flex-col gap-3 w-full text-left"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{getCategoryEmoji(order.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        {CATEGORY_LABELS[order.category]}
                      </p>
                      <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
                        {order.description}
                      </p>
                    </div>
                    {isRejected ? (
                      <span
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide"
                        style={{ background: 'rgb(var(--foreground-rgb) / 10%)', color: 'var(--muted-foreground)' }}
                      >
                        Не выбран
                      </span>
                    ) : (
                      <StatusBadge status={order.status} />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs font-medium text-muted-foreground">
                    <span>💰 Ваша цена: {myPrice.toLocaleString('ru-RU')} ₽</span>
                    <span>⏱️ {myTimeline}</span>
                    {isSelected && (
                      <span className="font-bold text-status-progress">✓ Вас выбрали!</span>
                    )}
                  </div>
                </button>

                {isSelected && (
                  <PressableButton
                    type="button"
                    onClick={() => router.push(`/chat/${order.id}`)}
                    className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-bold text-white"
                    style={{ background: 'var(--primary)', boxShadow: '0 3px 10px rgb(var(--primary-rgb) / 0.3)' }}
                  >
                    <MessageSquare className="size-4" aria-hidden="true" />
                    Чат с клиентом
                  </PressableButton>
                )}
              </MotionCard>
              </StaggerItem>
            );
          })}
          </Stagger>
        )}
      </section>
      </PageTransition>
      </div>

      <BottomNav />
    </main>
  );
}

function getCategoryEmoji(cat: string): string {
  const m: Record<string, string> = {
    hat: '🧢', sweater: '🧥', scarf: '🧣', toy: '🐻', accessory: '👜', other: '✨',
  };
  return m[cat] ?? '🧶';
}
