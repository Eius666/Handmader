'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { MotionCard, PressableButton } from '@/components/motion/Pressable';
import { getAvailableOrders } from '@/lib/firestore';
import { Order, OrderCategory, CATEGORY_LABELS } from '@/types';

const FILTERS: { key: OrderCategory | ''; label: string }[] = [
  { key: '',          label: 'Все' },
  { key: 'hat',       label: 'Шапки' },
  { key: 'sweater',   label: 'Свитеры' },
  { key: 'scarf',     label: 'Шарфы' },
  { key: 'toy',       label: 'Игрушки' },
  { key: 'accessory', label: 'Аксессуары' },
  { key: 'other',     label: 'Другое' },
];

export default function FeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<OrderCategory | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAvailableOrders()
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const displayed = filter ? orders.filter((o) => o.category === filter) : orders;

  const isFilterActive = filter !== '';
  const filterButton = (
    <PressableButton
      type="button"
      aria-label="Фильтр"
      onClick={() => setShowFilters((v) => !v)}
      className="flex size-11 items-center justify-center rounded-full"
      style={{
        background: showFilters || isFilterActive ? 'var(--primary)' : 'var(--card)',
        color:      showFilters || isFilterActive ? 'var(--primary-foreground)' : 'var(--foreground)',
        border: '1px solid rgb(var(--primary-rgb) / 12%)',
        boxShadow: showFilters || isFilterActive ? 'var(--shadow-primary)' : 'var(--shadow-sm)',
        transition: 'background 0.25s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.25s',
      }}
    >
      <SlidersHorizontal className="size-5" aria-hidden="true" />
    </PressableButton>
  );

  return (
    <PageLayout title="Заказы" headerRight={filterButton}>
      {/* Filter chips panel */}
      {showFilters && (
        <Stagger className="flex gap-2 overflow-x-auto px-5 pb-3 pt-2 scrollbar-none">
          {FILTERS.map(({ key, label }) => (
            <StaggerItem key={key} className="shrink-0">
              <PressableButton
                type="button"
                onClick={() => { setFilter(key); setShowFilters(false); }}
                className="rounded-full px-4 py-2 text-[13px] font-semibold"
                style={{
                  background: filter === key ? 'var(--primary)' : 'var(--card)',
                  color:      filter === key ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  border: `1px solid ${filter === key ? 'transparent' : 'rgb(var(--primary-rgb) / 12%)'}`,
                  boxShadow: filter === key ? 'var(--shadow-primary)' : 'var(--shadow-sm)',
                }}
              >
                {label}
              </PressableButton>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Active filter badge */}
      {isFilterActive && !showFilters && (
        <div className="flex items-center gap-2 px-5 pb-3 pt-1">
          <span className="text-[12px] text-muted-foreground">Категория:</span>
          <PressableButton
            type="button"
            onClick={() => setFilter('')}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--shadow-primary)' }}
          >
            {FILTERS.find((f) => f.key === filter)?.label}
            <span className="text-[10px] opacity-80">✕</span>
          </PressableButton>
        </div>
      )}

      <section className="flex flex-col gap-3 px-5 pt-2" aria-label="Список доступных заказов">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl"
                style={{
                  height: 160,
                  background: 'linear-gradient(90deg, rgb(var(--primary-rgb) / 6%) 0%, rgb(var(--primary-rgb) / 10%) 50%, rgb(var(--primary-rgb) / 6%) 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.4s infinite',
                }}
              />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl py-14 text-center"
            style={{ background: 'var(--card)', border: '1px solid rgb(var(--primary-rgb) / 8%)', boxShadow: 'var(--shadow-card)' }}
          >
            <span className="text-5xl">🧶</span>
            <p className="text-[14px] font-semibold text-muted-foreground">Заказов пока нет</p>
            <p className="text-[12px] text-muted-foreground">Попробуйте другую категорию</p>
          </div>
        ) : (
          <Stagger className="flex flex-col gap-3">
            {displayed.map((order) => (
              <StaggerItem key={order.id}>
                <BrowseOrderCard
                  order={order}
                  onRespond={() => router.push(`/orders/${order.id}/respond`)}
                  onDetail={() => router.push(`/orders/${order.id}`)}
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </PageLayout>
  );
}

function BrowseOrderCard({
  order, onRespond, onDetail,
}: {
  order: Order;
  onRespond: () => void;
  onDetail: () => void;
}) {
  const responseCount = Object.keys(order.responses ?? {}).length;

  return (
    <MotionCard
      interactive={false}
      className="flex flex-col gap-3"
      style={{
        background:   'var(--card)',
        border:       '1px solid rgb(var(--primary-rgb) / 9%)',
        borderRadius: 22,
        padding:      '16px',
        boxShadow:    'var(--shadow-card)',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-lg"
          style={{ background: 'linear-gradient(135deg, rgb(var(--primary-rgb) / 12%) 0%, rgb(var(--primary-rgb) / 6%) 100%)' }}
        >
          {getCategoryEmoji(order.category)}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {CATEGORY_LABELS[order.category]}
          </span>
          <h3 className="font-display text-[15px] font-semibold leading-snug text-foreground">
            {order.customerName}
          </h3>
        </div>
        {responseCount > 0 && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: 'rgb(var(--primary-rgb) / 10%)', color: 'var(--primary)' }}
          >
            {responseCount} откл.
          </span>
        )}
      </div>

      <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
        {order.description}
      </p>

      {order.photos && order.photos.length > 0 && (
        <ImageCarousel photos={order.photos} height="h-44" />
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="font-display font-tabular text-[16px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--primary)' }}>
          {order.budgetMin.toLocaleString('ru-RU')} — {order.budgetMax.toLocaleString('ru-RU')} ₽
        </span>
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          до {formatDate(order.deadline)}
        </span>
      </div>

      <div className="flex gap-2.5">
        <PressableButton
          type="button"
          onClick={onDetail}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold"
          style={{
            background:  'transparent',
            border:      '1.5px solid rgb(var(--primary-rgb) / 30%)',
            color:       'var(--primary)',
            letterSpacing: '0.01em',
          }}
        >
          Подробнее
        </PressableButton>
        <PressableButton
          type="button"
          onClick={onRespond}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold"
          style={{
            background: 'linear-gradient(160deg, var(--primary-soft) 0%, var(--primary) 100%)',
            color: 'var(--primary-foreground)',
            boxShadow:  'var(--shadow-primary)',
            letterSpacing: '0.01em',
          }}
        >
          Откликнуться
        </PressableButton>
      </div>
    </MotionCard>
  );
}

function getCategoryEmoji(cat: OrderCategory): string {
  const m: Record<OrderCategory, string> = {
    hat: '🧢', sweater: '🧥', scarf: '🧣', toy: '🐻', accessory: '👜', other: '✨',
  };
  return m[cat] ?? '🧶';
}

function formatDate(s: string) {
  try { return new Date(s).toLocaleDateString('ru', { day: 'numeric', month: 'long' }); }
  catch { return s; }
}
