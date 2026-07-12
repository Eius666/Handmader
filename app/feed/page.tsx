'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/layout/BottomNav';
import { getAvailableOrders } from '@/lib/firestore';
import { Order, OrderCategory, CATEGORY_LABELS } from '@/types';
import { cn } from '@/lib/utils';

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
    getAvailableOrders(filter || undefined)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-background pb-28">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pb-3 pt-8">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-0.5">
            Биржа
          </p>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-foreground leading-none">
            Заказы
          </h1>
        </div>
        <button
          type="button"
          aria-label="Фильтр"
          onClick={() => setShowFilters((v) => !v)}
          className="flex size-11 items-center justify-center rounded-full transition-all duration-200 active:scale-95"
          style={{
            background: showFilters ? '#d96c52' : '#ffffff',
            color:      showFilters ? '#ffffff' : '#1c1917',
            border: '1px solid rgba(180,100,70,0.12)',
            boxShadow: '0 2px 8px rgba(140,80,50,0.08)',
            transition: 'all 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* Filter chips */}
      {showFilters && (
        <div className="-mx-0 flex gap-2 overflow-x-auto px-5 pb-3 pt-1 scrollbar-none">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setFilter(key); setShowFilters(false); }}
              className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 active:scale-95"
              style={{
                background: filter === key ? '#d96c52' : '#ffffff',
                color:      filter === key ? '#ffffff' : '#78716c',
                border: '1px solid rgba(180,100,70,0.12)',
                boxShadow: filter === key
                  ? '0 4px 14px rgba(217,108,82,0.3)'
                  : '0 1px 4px rgba(140,80,50,0.06)',
                transition: 'all 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            >
              {label}
            </button>
          ))}
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
        ) : orders.length === 0 ? (
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
          orders.map((order) => (
            <BrowseOrderCard
              key={order.id}
              order={order}
              onRespond={() => router.push(`/orders/${order.id}/respond`)}
              onDetail={() => router.push(`/orders/${order.id}`)}
            />
          ))
        )}
      </section>

      <BottomNav />
    </main>
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
      className="flex flex-col gap-3"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(180,100,70,0.08)',
        borderRadius: 20,
        padding: '16px',
        boxShadow: '0 2px 12px rgba(140,80,50,0.06)',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-lg"
          style={{ background: 'rgba(217,108,82,0.1)' }}
        >
          {getCategoryEmoji(order.category)}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
            {CATEGORY_LABELS[order.category]}
          </span>
          <h3 className="text-[14px] font-bold leading-snug text-foreground">
            от {order.customerName}
          </h3>
        </div>
        {responseCount > 0 && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{
              background: 'rgba(217,108,82,0.1)',
              color: '#d96c52',
            }}
          >
            {responseCount} откл.
          </span>
        )}
      </div>

      <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
        {order.description}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-[15px] font-extrabold text-foreground tracking-[-0.02em]">
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
          className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-foreground transition-all duration-200 active:scale-[0.98]"
          style={{
            background: 'rgba(180,100,70,0.07)',
            border: '1px solid rgba(180,100,70,0.1)',
          }}
        >
          Подробнее
        </button>
        <button
          type="button"
          onClick={onRespond}
          className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white transition-all duration-200 active:scale-[0.98]"
          style={{
            background: '#d96c52',
            boxShadow: '0 4px 12px rgba(217,108,82,0.3)',
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
  try { return new Date(s).toLocaleDateString('ru', { day: 'numeric', month: 'short' }); }
  catch { return s; }
}
