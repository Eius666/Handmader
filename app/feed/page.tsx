'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
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
    <button
      type="button"
      aria-label="Фильтр"
      onClick={() => setShowFilters((v) => !v)}
      className="flex size-11 items-center justify-center rounded-full transition-all duration-200 active:scale-95"
      style={{
        background: showFilters || isFilterActive ? '#C2703E' : '#FFFDF9',
        color:      showFilters || isFilterActive ? '#ffffff' : '#2A1A0E',
        border: '1px solid rgba(194,112,62,0.12)',
        boxShadow: showFilters || isFilterActive
          ? 'var(--shadow-primary)'
          : 'var(--shadow-sm)',
        transition: 'all 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      <SlidersHorizontal className="size-5" aria-hidden="true" />
    </button>
  );

  return (
    <PageLayout title="Заказы" headerRight={filterButton}>
      {/* Filter chips panel */}
      {showFilters && (
        <div className="flex gap-2 overflow-x-auto px-5 pb-3 pt-2 scrollbar-none">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setFilter(key); setShowFilters(false); }}
              className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 active:scale-95"
              style={{
                background: filter === key ? '#C2703E' : '#FFFDF9',
                color:      filter === key ? '#ffffff' : '#9C7E68',
                border: `1px solid ${filter === key ? 'transparent' : 'rgba(194,112,62,0.12)'}`,
                boxShadow: filter === key
                  ? 'var(--shadow-primary)'
                  : 'var(--shadow-sm)',
                transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Active filter badge */}
      {isFilterActive && !showFilters && (
        <div className="flex items-center gap-2 px-5 pb-3 pt-1">
          <span className="text-[12px] text-muted-foreground">Категория:</span>
          <button
            type="button"
            onClick={() => setFilter('')}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold text-white active:scale-95"
            style={{ background: '#C2703E', boxShadow: 'var(--shadow-primary)' }}
          >
            {FILTERS.find((f) => f.key === filter)?.label}
            <span className="text-[10px] opacity-80">✕</span>
          </button>
        </div>
      )}

      <section className="flex flex-col gap-3 px-5 pt-2" aria-label="Список доступных заказов">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl"
                style={{ height: 160, background: 'rgba(180,100,70,0.06)' }}
              />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl py-14 text-center"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(180,100,70,0.08)',
              boxShadow: '0 2px 12px rgba(140,80,50,0.06)',
            }}
          >
            <span className="text-5xl">🧶</span>
            <p className="text-[14px] font-semibold text-muted-foreground">Заказов пока нет</p>
            <p className="text-[12px] text-muted-foreground">Попробуйте другую категорию</p>
          </div>
        ) : (
          displayed.map((order) => (
            <BrowseOrderCard
              key={order.id}
              order={order}
              onRespond={() => router.push(`/orders/${order.id}/respond`)}
              onDetail={() => router.push(`/orders/${order.id}`)}
            />
          ))
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
    <article
      className="flex flex-col gap-3 transition-all duration-200 active:scale-[0.99]"
      style={{
        background:   '#FFFDF9',
        border:       '1px solid rgba(194,112,62,0.09)',
        borderRadius: 22,
        padding:      '16px',
        boxShadow:    'var(--shadow-card)',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-lg"
          style={{ background: 'linear-gradient(135deg, rgba(194,112,62,0.12) 0%, rgba(194,112,62,0.06) 100%)' }}
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
            style={{ background: 'rgba(194,112,62,0.1)', color: '#C2703E' }}
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
        <span className="font-display text-[16px] font-bold tracking-[-0.02em]" style={{ color: '#C2703E' }}>
          {order.budgetMin.toLocaleString('ru-RU')} — {order.budgetMax.toLocaleString('ru-RU')} ₽
        </span>
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          до {formatDate(order.deadline)}
        </span>
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onDetail}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all duration-200 active:scale-[0.97]"
          style={{
            background:  'transparent',
            border:      '1.5px solid rgba(194,112,62,0.3)',
            color:       '#C2703E',
            letterSpacing: '0.01em',
          }}
        >
          Подробнее
        </button>
        <button
          type="button"
          onClick={onRespond}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold text-white transition-all duration-200 active:scale-[0.97]"
          style={{
            background: 'linear-gradient(160deg, #d97152 0%, #C2703E 100%)',
            boxShadow:  '0 4px 14px rgba(194,112,62,0.32)',
            letterSpacing: '0.01em',
          }}
        >
          Откликнуться
        </button>
      </div>
    </article>
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
