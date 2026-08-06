'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shirt, HardHat, Wind, Baby, Sparkles, Package, Plus, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { MotionCard, PressableButton } from '@/components/motion/Pressable';
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
      .then((o) => setOrders(o.filter((x) => x.status !== 'completed').slice(0, 5)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const firstName = user?.displayName?.split(' ')[0] ?? 'друг';

  return (
    <PageLayout>
      <div className="flex flex-col gap-6 px-5 pt-5">

        {/* ── Greeting ── */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-medium text-muted-foreground">
              {getGreeting()}, {firstName}
            </span>
            <span className="font-display text-[24px] font-semibold tracking-[-0.01em] text-foreground leading-tight">
              Уютная мастерская
            </span>
          </div>
          <NotificationBell />
          <PressableButton
            onClick={() => router.push('/profile')}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-base font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--primary), var(--primary-soft))',
              color: 'var(--primary-foreground)',
              boxShadow: 'var(--shadow-primary)',
              letterSpacing: '-0.01em',
            }}
            aria-label="Профиль"
          >
            {firstName[0]?.toUpperCase() ?? '?'}
          </PressableButton>
        </header>

        {/* ── Search / New order CTA ── */}
        <PressableButton
          onClick={() => router.push('/orders/new')}
          className="flex items-center gap-3 w-full text-left"
          style={{
            background: 'rgb(var(--primary-rgb) / 5%)',
            border: '1.5px dashed rgb(var(--primary-rgb) / 30%)',
            borderRadius: 18,
            padding: '16px 20px',
          }}
          aria-label="Создать заказ"
        >
          <div
            className="flex size-9 items-center justify-center rounded-full shrink-0"
            style={{ background: 'rgb(var(--primary-rgb) / 10%)' }}
          >
            <Plus className="size-4 text-primary" aria-hidden="true" />
          </div>
          <span className="text-[15px] font-medium text-muted-foreground flex-1">
            Что хотите заказать?
          </span>
          <div
            className="flex size-7 items-center justify-center rounded-full shrink-0"
            style={{ background: 'rgb(var(--primary-rgb) / 10%)' }}
          >
            <ChevronRight className="size-3.5 text-primary" aria-hidden="true" />
          </div>
        </PressableButton>

        {/* ── Categories ── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
              Категории
            </h2>
          </div>
          <Stagger className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-0.5 scrollbar-none">
            {(Object.keys(CATEGORY_ICONS) as OrderCategory[]).map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <StaggerItem key={cat} className="shrink-0">
                  <PressableButton
                    onClick={() => router.push(`/orders/new?category=${cat}`)}
                    className="flex flex-col items-center gap-2 rounded-2xl px-4 py-3.5"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid rgb(var(--primary-rgb) / 8%)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <span
                      className="flex size-10 items-center justify-center rounded-xl"
                      style={{ background: 'rgb(var(--primary-rgb) / 10%)' }}
                    >
                      <Icon className="size-5" aria-hidden="true" style={{ color: 'var(--primary)', opacity: 0.85 }} />
                    </span>
                    <span className="text-[11px] font-semibold text-foreground whitespace-nowrap tracking-tight">
                      {CATEGORY_LABELS[cat]}
                    </span>
                  </PressableButton>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>

        {/* ── Active orders ── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
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
                    background: 'linear-gradient(90deg, rgb(var(--primary-rgb) / 6%) 0%, rgb(var(--primary-rgb) / 10%) 50%, rgb(var(--primary-rgb) / 6%) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s infinite',
                  }}
                />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 rounded-2xl p-8 text-center"
              style={{ background: 'var(--card)', border: '1px solid rgb(var(--primary-rgb) / 8%)', boxShadow: 'var(--shadow-card)' }}
            >
              <span className="text-4xl">🧶</span>
              <p className="text-[13px] font-medium text-muted-foreground leading-snug">
                Заказов пока нет
              </p>
              <PressableButton
                onClick={() => router.push('/orders/new')}
                className="rounded-full px-5 py-2 text-[13px] font-bold"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--shadow-primary)' }}
              >
                Создать первый
              </PressableButton>
            </div>
          ) : (
            <Stagger className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 scrollbar-none">
              {orders.map((order) => (
                <StaggerItem key={order.id} className="shrink-0 snap-start">
                  <OrderCard
                    order={order}
                    onClick={() => {
                      if (['master_selected', 'in_progress', 'ready', 'delivered'].includes(order.status)) {
                        router.push(`/track/${order.id}`);
                      } else {
                        router.push(`/orders/${order.id}`);
                      }
                    }}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>
      </div>
    </PageLayout>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const Icon = CATEGORY_ICONS[order.category] ?? Package;
  return (
    <MotionCard
      className="w-56"
      style={{
        background: 'rgb(var(--primary-rgb) / 4%)',
        border: '1px solid rgb(var(--primary-rgb) / 8%)',
        borderRadius: 20,
        padding: 4,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex h-[152px] w-full flex-col justify-between text-left"
        style={{
          background: 'var(--card)',
          borderRadius: 16,
          padding: '16px',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9)',
        }}
      >
        <div className="flex items-start justify-between">
          <span
            className="flex size-11 items-center justify-center rounded-xl"
            style={{ background: 'rgb(var(--primary-rgb) / 10%)' }}
          >
            <Icon className="size-5" aria-hidden="true" style={{ color: 'var(--primary)' }} />
          </span>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            {CATEGORY_LABELS[order.category]}
          </span>
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
            {order.description}
          </h3>
        </div>
      </button>
    </MotionCard>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 17) return 'Добрый день';
  return 'Добрый вечер';
}
