'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { getMyProposals, reconfirmProposal } from '@/lib/proposals';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/layout/BottomNav';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { MotionCard, PressableButton } from '@/components/motion/Pressable';
import { PageTransition } from '@/components/motion/PageTransition';
import { OrderCategory, OrderStatus, CATEGORY_LABELS } from '@/types';

interface Entry {
  order: {
    id: string;
    description: string;
    category: OrderCategory;
    status: OrderStatus;
    selectedMasterId?: string;
  };
  myPrice: number;
  myTimeline: string;
  isSelected: boolean;
  proposalStatus?: string;
  reconfirmationDeadline?: Date;
}

export default function MyResponsesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'customer') return;
    async function load() {
      try {
        const rows = await getMyProposals();
        const result: Entry[] = rows.map(({ order, proposal }) => ({
          order,
          myPrice: proposal.price,
          myTimeline: proposal.timeline,
          isSelected: order.selectedMasterId === user!.uid,
          proposalStatus: proposal.status,
          reconfirmationDeadline: proposal.reconfirmationDeadline,
        }));
        setEntries(result);
        setLoadError(false);
      } catch (err) {
        console.error(err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [retryKey, user]);

  const isLoading = loading && user?.role !== 'customer';

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
        {isLoading ? (
          <div className="flex justify-center py-16">
            <span className="size-8 rounded-full border-2 border-secondary border-t-primary animate-spin" />
          </div>
        ) : loadError ? (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl py-14 text-center"
            style={{ background: 'var(--card)', border: '1px solid rgb(var(--foreground-rgb) / 0.08)', boxShadow: 'var(--shadow-card)' }}
          >
            <span className="text-5xl" aria-hidden="true">↻</span>
            <p className="text-[14px] font-semibold text-foreground">Не удалось загрузить отклики</p>
            <p className="text-[12px] text-muted-foreground">Проверьте соединение и попробуйте ещё раз</p>
            <PressableButton
              type="button"
              onClick={() => {
                setLoading(true);
                setLoadError(false);
                setRetryKey((value) => value + 1);
              }}
              className="mt-2 rounded-full px-6 py-2.5 text-[13px] font-bold text-white"
              style={{ background: 'var(--primary)', boxShadow: 'var(--shadow-primary)' }}
            >
              Повторить
            </PressableButton>
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
          {entries.map(({ order, myPrice, myTimeline, isSelected, proposalStatus, reconfirmationDeadline }) => {
            const isRejected = order.status === 'master_selected' && !isSelected;
            const needsReconfirmation = proposalStatus === 'reconfirmation_required';
            const excluded = proposalStatus === 'excluded';
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

                {needsReconfirmation && (
                  <div className="flex flex-col gap-2 rounded-xl bg-status-waiting/10 p-3">
                    <p className="text-xs font-semibold text-foreground">
                      Подтвердите, что цена и срок ещё актуальны
                      {reconfirmationDeadline ? ` до ${reconfirmationDeadline.toLocaleString('ru-RU')}` : ''}.
                    </p>
                    <PressableButton
                      type="button"
                      disabled={busyOrderId === order.id}
                      onClick={async () => {
                        setBusyOrderId(order.id);
                        try {
                          await reconfirmProposal(order.id);
                          setEntries((current) => current.map((entry) => entry.order.id === order.id
                            ? { ...entry, proposalStatus: 'active', reconfirmationDeadline: undefined }
                            : entry));
                        } finally {
                          setBusyOrderId(null);
                        }
                      }}
                      className="rounded-xl bg-primary py-2.5 text-[13px] font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {busyOrderId === order.id ? 'Подтверждаем...' : 'Подтвердить отклик'}
                    </PressableButton>
                  </div>
                )}

                {excluded && (
                  <p className="rounded-xl bg-secondary p-3 text-xs font-semibold text-muted-foreground">
                    Вы исключены из повторного выбора по этому заказу.
                  </p>
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
