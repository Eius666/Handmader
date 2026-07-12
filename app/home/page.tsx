'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Shirt, HardHat, Wind, Baby, Sparkles, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/layout/BottomNav';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getCustomerOrders } from '@/lib/firestore';
import { Order, OrderCategory, CATEGORY_LABELS } from '@/types';

const CATEGORY_ICONS: Record<OrderCategory, LucideIcon> = {
  hat:       HardHat,
  sweater:   Shirt,
  scarf:     Wind,
  toy:       Baby,
  accessory: Sparkles,
  other:     Package,
};

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getCustomerOrders(user.uid)
      .then((o) => setOrders(o.slice(0, 5)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const firstName = user?.displayName?.split(' ')[0] ?? 'друг';

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <div className="flex flex-1 flex-col gap-6 px-5 pt-6 pb-28">

        {/* Greeting + search */}
        <header className="flex flex-col gap-5 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">
                Привет, {firstName} 👋
              </span>
              <span className="text-base font-bold text-foreground">Уютная мастерская</span>
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="flex size-11 items-center justify-center rounded-full bg-secondary text-lg font-bold text-primary"
              aria-label="Профиль"
            >
              {firstName[0]?.toUpperCase() ?? '?'}
            </button>
          </div>

          <button
            onClick={() => router.push('/orders/new')}
            className="flex items-center gap-3 rounded-3xl bg-card px-5 py-4 shadow-[0_4px_20px_rgba(224,122,95,0.1)] w-full text-left"
            aria-label="Создать заказ"
          >
            <Search className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-lg font-medium text-muted-foreground">
              Что хотите создать?
            </span>
          </button>
        </header>

        {/* Quick categories */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-foreground px-1">Популярные категории</h2>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-none">
            {(Object.keys(CATEGORY_ICONS) as OrderCategory[]).map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => router.push(`/orders/new?category=${cat}`)}
                  className="flex shrink-0 flex-col items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-[0_2px_8px_rgba(45,45,45,0.06)] transition-transform active:scale-95"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                    {CATEGORY_LABELS[cat]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Active orders */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-foreground">Активные заказы</h2>
            <button
              onClick={() => router.push('/orders')}
              className="text-sm font-semibold text-primary"
            >
              Все
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <span
                className="size-7 rounded-full border-2 border-secondary border-t-primary animate-spin"
                aria-label="Загрузка"
              />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 text-center shadow-[0_4px_20px_rgba(45,45,45,0.06)]">
              <span className="text-4xl">🧶</span>
              <p className="text-sm font-medium text-muted-foreground">
                У вас пока нет заказов
              </p>
              <button
                onClick={() => router.push('/orders/new')}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[0_4px_14px_rgba(224,122,95,0.35)] transition-transform active:scale-95"
              >
                Создать первый
              </button>
            </div>
          ) : (
            <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 scrollbar-none">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => {
                    if (order.status === 'in_progress' || order.status === 'ready' || order.status === 'delivered') {
                      router.push(`/track/${order.id}`);
                    } else {
                      router.push(`/orders/${order.id}`);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const Icon = CATEGORY_ICONS[order.category] ?? Package;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-56 shrink-0 snap-start flex-col gap-4 rounded-2xl bg-card p-5 text-left shadow-[0_4px_20px_rgba(224,122,95,0.12)] transition-transform active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <StatusBadge status={order.status} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">
          {CATEGORY_LABELS[order.category]}
        </span>
        <h3 className="text-base font-bold leading-snug text-card-foreground">
          {order.description.length > 50
            ? order.description.slice(0, 50) + '…'
            : order.description}
        </h3>
      </div>
    </button>
  );
}
