'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shirt, HardHat, Wind, Baby, Sparkles, Package, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/layout/BottomNav';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getCustomerOrders } from '@/lib/firestore';
import { Order, OrderCategory, CATEGORY_LABELS, OrderStatus } from '@/types';

const CATEGORY_ICONS: Record<OrderCategory, LucideIcon> = {
  hat:       HardHat,
  sweater:   Shirt,
  scarf:     Wind,
  toy:       Baby,
  accessory: Sparkles,
  other:     Package,
};

const ACTIVE_STATUSES: OrderStatus[] = ['awaiting_responses', 'master_selected', 'in_progress', 'ready', 'delivered'];

export default function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    if (!user) return;
    getCustomerOrders(user.uid)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = orders.filter((o) =>
    tab === 'active'
      ? ACTIVE_STATUSES.includes(o.status)
      : o.status === 'completed',
  );

  function handleCardClick(order: Order) {
    if (order.status === 'in_progress' || order.status === 'ready' || order.status === 'delivered') {
      router.push(`/track/${order.id}`);
    } else {
      router.push(`/orders/${order.id}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pb-2 pt-8">
        <h1 className="text-2xl font-extrabold text-foreground">Мои заказы</h1>
        <button
          onClick={() => router.push('/orders/new')}
          aria-label="Новый заказ"
          className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(224,122,95,0.35)]"
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3 pb-1">
        {(['active', 'completed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
              tab === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {t === 'active' ? 'Активные' : 'Завершённые'}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-4 px-5 pt-3 pb-28">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="size-8 rounded-full border-2 border-secondary border-t-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-card py-12 text-center shadow-[0_4px_20px_rgba(45,45,45,0.06)]">
            <span className="text-5xl">📋</span>
            <p className="text-base font-semibold text-muted-foreground">
              {tab === 'active' ? 'Активных заказов нет' : 'Завершённых заказов нет'}
            </p>
            {tab === 'active' && (
              <button
                onClick={() => router.push('/orders/new')}
                className="mt-1 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_4px_14px_rgba(224,122,95,0.35)]"
              >
                Создать заказ
              </button>
            )}
          </div>
        ) : (
          filtered.map((order) => (
            <OrderListCard key={order.id} order={order} onClick={() => handleCardClick(order)} />
          ))
        )}
      </section>

      <BottomNav />
    </main>
  );
}

function OrderListCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const Icon = CATEGORY_ICONS[order.category] ?? Package;
  const responseCount = Object.keys(order.responses ?? {}).length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-3 rounded-2xl bg-card p-4 text-left shadow-[0_4px_20px_rgba(224,122,95,0.08)] transition-transform active:scale-[0.98] w-full"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-muted-foreground">{CATEGORY_LABELS[order.category]}</span>
          <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground">
            {order.description}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs font-medium text-muted-foreground">
        <span>💰 {order.budgetMin.toLocaleString('ru-RU')} — {order.budgetMax.toLocaleString('ru-RU')} ₽</span>
        <span>📅 до {formatDate(order.deadline)}</span>
        {responseCount > 0 && (
          <span className="text-primary font-semibold">💬 {responseCount}</span>
        )}
      </div>
    </button>
  );
}

function formatDate(s: string) {
  try { return new Date(s).toLocaleDateString('ru', { day: 'numeric', month: 'short' }); }
  catch { return s; }
}
