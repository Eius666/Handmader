'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, Clock, MapPin } from 'lucide-react';
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderCategory | ''>('');
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
      <header className="flex items-center justify-between px-5 pb-2 pt-8">
        <h1 className="text-2xl font-extrabold text-foreground">Новые заказы</h1>
        <button
          type="button"
          aria-label="Фильтр"
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'flex size-11 items-center justify-center rounded-full bg-card text-foreground shadow-[0_4px_20px_rgba(224,122,95,0.12)]',
            showFilters && 'bg-primary text-primary-foreground',
          )}
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* Filter chips */}
      {showFilters && (
        <div className="-mx-0 flex gap-2.5 overflow-x-auto px-5 pb-3 pt-1 scrollbar-none">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setFilter(key); setShowFilters(false); }}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                filter === key
                  ? 'bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(224,122,95,0.35)]'
                  : 'bg-card text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <section
        className="flex flex-col gap-4 px-5 pt-3"
        aria-label="Список доступных заказов"
      >
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="size-8 rounded-full border-2 border-secondary border-t-primary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-card py-12 text-center shadow-[0_4px_20px_rgba(45,45,45,0.06)]">
            <span className="text-5xl">🧶</span>
            <p className="text-base font-semibold text-muted-foreground">
              Заказов пока нет
            </p>
            <p className="text-sm text-muted-foreground">
              Попробуйте другую категорию или загляните позже
            </p>
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
  order,
  onRespond,
  onDetail,
}: {
  order: Order;
  onRespond: () => void;
  onDetail: () => void;
}) {
  const responseCount = Object.keys(order.responses ?? {}).length;

  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-[0_4px_20px_rgba(224,122,95,0.12)]">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg">
          {getCategoryEmoji(order.category)}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-muted-foreground">
            {CATEGORY_LABELS[order.category]}
          </span>
          <h3 className="text-base font-bold leading-snug text-card-foreground">
            от {order.customerName}
          </h3>
        </div>
        {responseCount > 0 && (
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {responseCount} откл.
          </span>
        )}
      </div>

      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {order.description}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-base font-bold text-primary">
          {order.budgetMin.toLocaleString('ru-RU')} — {order.budgetMax.toLocaleString('ru-RU')} ₽
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          до {formatDate(order.deadline)}
        </span>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDetail}
          className="flex-1 rounded-xl border-2 border-secondary py-2.5 text-sm font-bold text-foreground transition-colors active:bg-secondary"
        >
          Подробнее
        </button>
        <button
          type="button"
          onClick={onRespond}
          className="flex-2 rounded-xl border-2 border-primary py-2.5 px-4 text-sm font-bold text-primary transition-colors active:bg-primary/10"
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
