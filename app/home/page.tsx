'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shirt, HardHat, Wind, Baby, Sparkles, Package, Plus, ChevronRight } from 'lucide-react';
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

const CATEGORY_COLORS: Record<OrderCategory, string> = {
  hat:       'rgba(217,108,82,0.12)',
  sweater:   'rgba(100,140,100,0.12)',
  scarf:     'rgba(100,120,180,0.12)',
  toy:       'rgba(220,160,60,0.12)',
  accessory: 'rgba(160,100,200,0.12)',
  other:     'rgba(120,120,120,0.1)',
};

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getCustomerOrders(user.uid)
      .then((o) => setOrders(o.filter((x) => x.status !== 'completed').slice(0, 5)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const firstName = user?.displayName?.split(' ')[0] ?? 'друг';

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <div className="flex flex-1 flex-col gap-6 px-5 pb-28 pt-5">

        {/* ── Greeting ── */}
        <header className="flex items-start justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-muted-foreground tracking-wide">
              {getGreeting()}, {firstName}
            </span>
            <span className="text-[22px] font-extrabold tracking-[-0.03em] text-foreground leading-tight">
              Уютная мастерская
            </span>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="flex size-11 items-center justify-center rounded-full text-base font-bold text-white transition-all duration-200 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #d96c52, #f2a47e)',
              boxShadow: '0 4px 14px rgba(217,108,82,0.35)',
              letterSpacing: '-0.01em',
            }}
            aria-label="Профиль"
          >
            {firstName[0]?.toUpperCase() ?? '?'}
          </button>
        </header>

        {/* ── Search / New order CTA ── */}
        <button
          onClick={() => router.push('/orders/new')}
          className="flex items-center gap-3 w-full text-left transition-all duration-300 active:scale-[0.98]"
          style={{
            background: 'rgba(217,108,82,0.06)',
            border: '1.5px dashed rgba(217,108,82,0.3)',
            borderRadius: 18,
            padding: '16px 20px',
          }}
          aria-label="Создать заказ"
        >
          <div
            className="flex size-9 items-center justify-center rounded-full shrink-0"
            style={{ background: 'rgba(217,108,82,0.12)' }}
          >
            <Plus className="size-4 text-primary" aria-hidden="true" />
          </div>
          <span className="text-[15px] font-medium text-muted-foreground flex-1">
            Что хотите заказать?
          </span>
          <div
            className="flex size-7 items-center justify-center rounded-full shrink-0"
            style={{ background: 'rgba(217,108,82,0.1)' }}
          >
            <ChevronRight className="size-3.5 text-primary" aria-hidden="true" />
          </div>
        </button>

        {/* ── Categories ── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Категории
            </h2>
          </div>
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-0.5 scrollbar-none">
            {(Object.keys(CATEGORY_ICONS) as OrderCategory[]).map((cat, idx) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => router.push(`/orders/new?category=${cat}`)}
                  className="flex shrink-0 flex-col items-center gap-2 rounded-2xl px-4 py-3.5 transition-all duration-200 active:scale-95"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(180,100,70,0.08)',
                    boxShadow: '0 2px 8px rgba(140,80,50,0.06)',
                    animationDelay: `${idx * 40}ms`,
                  }}
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-xl"
                    style={{ background: CATEGORY_COLORS[cat] }}
                  >
                    <Icon className="size-5 text-foreground" aria-hidden="true" style={{ opacity: 0.7 }} />
                  </span>
                  <span className="text-[11px] font-semibold text-foreground whitespace-nowrap tracking-tight">
                    {CATEGORY_LABELS[cat]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Active orders ── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Активные заказы
            </h2>
            <button
              onClick={() => router.push('/orders')}
              className="text-[12px] font-semibold text-primary flex items-center gap-0.5"
            >
              Все <ChevronRight className="size-3" />
            </button>
          </div>

          {loading ? (
            <div className="flex gap-3">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="w-52 shrink-0 rounded-2xl"
                  style={{
                    height: 140,
                    background: 'linear-gradient(90deg, rgba(180,100,70,0.06) 0%, rgba(180,100,70,0.1) 50%, rgba(180,100,70,0.06) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s infinite',
                  }}
                />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 rounded-2xl p-8 text-center"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(180,100,70,0.08)',
                boxShadow: '0 2px 12px rgba(140,80,50,0.06)',
              }}
            >
              <span className="text-4xl">🧶</span>
              <p className="text-[13px] font-medium text-muted-foreground leading-snug">
                Заказов пока нет
              </p>
              <button
                onClick={() => router.push('/orders/new')}
                className="rounded-full px-5 py-2 text-[13px] font-bold text-primary-foreground transition-all active:scale-95"
                style={{ background: '#d96c52', boxShadow: '0 4px 14px rgba(217,108,82,0.3)' }}
              >
                Создать первый
              </button>
            </div>
          ) : (
            <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 scrollbar-none">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => {
                    if (['master_selected', 'in_progress', 'ready', 'delivered'].includes(order.status)) {
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
    /* Double-bezel card */
    <div
      className="w-56 shrink-0 snap-start"
      style={{
        background: 'rgba(180,100,70,0.04)',
        border: '1px solid rgba(180,100,70,0.08)',
        borderRadius: 20,
        padding: 4,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col gap-3 text-left transition-all duration-200 active:scale-[0.98]"
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '16px',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)',
        }}
      >
        <div className="flex items-start justify-between">
          <span
            className="flex size-11 items-center justify-center rounded-xl"
            style={{ background: 'rgba(217,108,82,0.1)' }}
          >
            <Icon className="size-5 text-primary" aria-hidden="true" />
          </span>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
            {CATEGORY_LABELS[order.category]}
          </span>
          <h3 className="text-[13px] font-bold leading-snug text-foreground">
            {order.description.length > 55
              ? order.description.slice(0, 55) + '…'
              : order.description}
          </h3>
        </div>
      </button>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 17) return 'Добрый день';
  return 'Добрый вечер';
}
