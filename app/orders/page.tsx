'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Shirt, HardHat, Wind, Baby, Sparkles, Package, Plus, Star, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RatingModal } from '@/components/RatingModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Toast } from '@/components/ui/Toast';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { MotionCard, PressableButton } from '@/components/motion/Pressable';
import { getCustomerOrders, submitRating, deleteOrder } from '@/lib/firestore';
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
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

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
    if (['master_selected', 'in_progress', 'ready', 'delivered'].includes(order.status)) {
      router.push(`/track/${order.id}`);
    } else {
      router.push(`/orders/${order.id}`);
    }
  }

  const DELETABLE: OrderStatus[] = ['awaiting_responses', 'master_selected'];

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteOrder(deleteTarget.id);
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setToast('Заказ удалён');
      setDeleteTarget(null);
    } catch {
      setToast('Не удалось удалить заказ');
    } finally {
      setDeleting(false);
    }
  }

  async function handleRatingSend(rating: number, comment: string) {
    if (!ratingOrder?.selectedMasterId || !user) return;
    await submitRating(ratingOrder.id, ratingOrder.selectedMasterId, user.uid, rating, comment);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === ratingOrder.id
          ? { ...o, ratings: [...(o.ratings ?? []), { rating, comment, createdAt: new Date(), userId: user.uid }] }
          : o,
      ),
    );
    setRatingOrder(null);
  }

  const newOrderBtn = (
    <PressableButton
      onClick={() => router.push('/orders/new')}
      aria-label="Новый заказ"
      className="flex size-11 items-center justify-center rounded-full"
      style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--shadow-primary)' }}
    >
      <Plus className="size-5" aria-hidden="true" />
    </PressableButton>
  );

  return (
    <PageLayout title="Заказы" headerRight={newOrderBtn}>
      {/* Tabs */}
      <div
        className="mx-5 mt-4 mb-4 flex w-fit gap-1 rounded-xl p-1 min-w-[240px] max-w-sm"
        style={{ background: 'rgb(var(--primary-rgb) / 7%)' }}
      >
        {(['active', 'completed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative flex-1 rounded-lg py-2.5 text-[13px] font-bold"
            style={{ color: tab === t ? 'var(--primary)' : 'var(--muted-foreground)' }}
          >
            {tab === t && (
              <motion.span
                layoutId="orders-tab-pill"
                className="absolute inset-0 rounded-lg"
                style={{ background: 'var(--card)', boxShadow: 'var(--shadow-sm)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{t === 'active' ? 'Активные' : 'Завершённые'}</span>
          </button>
        ))}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 px-5 items-start">
        {loading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl"
                style={{ height: 90, background: 'rgb(var(--primary-rgb) / 6%)', border: '1px solid rgb(var(--primary-rgb) / 6%)' }}
              />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div
            className="col-span-full flex flex-col items-center gap-3 rounded-2xl py-14 text-center"
            style={{ background: 'var(--card)', border: '1px solid rgb(var(--primary-rgb) / 8%)', boxShadow: 'var(--shadow-card)' }}
          >
            <span className="text-5xl">📋</span>
            <p className="text-[14px] font-semibold text-muted-foreground">
              {tab === 'active' ? 'Активных заказов нет' : 'Завершённых заказов нет'}
            </p>
            {tab === 'active' && (
              <PressableButton
                onClick={() => router.push('/orders/new')}
                className="mt-1 rounded-full px-6 py-2.5 text-[13px] font-bold"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--shadow-primary)' }}
              >
                Создать заказ
              </PressableButton>
            )}
          </div>
        ) : (
          <Stagger className="contents">
            {filtered.map((order) => {
              const canRate =
                order.status === 'completed' &&
                !!order.selectedMasterId &&
                !order.ratings?.some((r) => r.userId === user?.uid);
              const canDelete = DELETABLE.includes(order.status);
              return (
                <StaggerItem key={order.id}>
                  <OrderListCard
                    order={order}
                    onClick={() => handleCardClick(order)}
                    canRate={canRate}
                    onRate={() => setRatingOrder(order)}
                    canDelete={canDelete}
                    onDelete={() => setDeleteTarget(order)}
                  />
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </section>

      {ratingOrder && (
        <RatingModal
          masterName={ratingOrder.selectedMasterName}
          onSend={handleRatingSend}
          onSkip={() => setRatingOrder(null)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить заказ?"
        body={deleteTarget
          ? (deleteTarget.description.length > 80 ? deleteTarget.description.slice(0, 80) + '…' : deleteTarget.description)
          : ''}
        confirmLabel="Удалить"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  );
}

function OrderListCard({
  order, onClick, canRate, onRate, canDelete, onDelete,
}: {
  order: Order;
  onClick: () => void;
  canRate?: boolean;
  onRate?: () => void;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const Icon = CATEGORY_ICONS[order.category] ?? Package;
  const responseCount = Object.keys(order.responses ?? {}).length;

  return (
    <MotionCard
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="flex flex-col gap-3 w-full text-left cursor-pointer"
      style={{
        background:   'var(--card)',
        border:       '1px solid rgb(var(--primary-rgb) / 9%)',
        borderRadius: 20,
        padding:      '14px 16px',
        boxShadow:    'var(--shadow-card)',
      }}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgb(var(--primary-rgb) / 10%)' }}
        >
          <Icon className="size-5" aria-hidden="true" style={{ color: 'var(--primary)' }} />
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            {CATEGORY_LABELS[order.category]}
          </span>
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
            {order.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={order.status} />
          {canDelete && (
            <button
              type="button"
              aria-label="Удалить заказ"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="flex size-7 items-center justify-center rounded-full transition-colors active:scale-95"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-foreground)')}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom meta row */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-[11px] font-medium text-muted-foreground"
        style={{ borderTop: '1px solid rgb(var(--primary-rgb) / 8%)' }}
      >
        <span className="font-display font-tabular font-semibold" style={{ color: 'var(--primary)' }}>
          {order.budgetMin.toLocaleString('ru-RU')} — {order.budgetMax.toLocaleString('ru-RU')} ₽
        </span>
        <span>до {formatDate(order.deadline)}</span>
        {responseCount > 0 && (
          <span className="font-bold text-primary ml-auto">{responseCount} откл.</span>
        )}
        {canRate && (
          <PressableButton
            type="button"
            onClick={(e) => { e.stopPropagation(); onRate?.(); }}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold"
            style={{ background: 'var(--gold)', color: 'var(--gold-foreground)', boxShadow: 'var(--shadow-gold)' }}
          >
            <Star className="size-3 fill-current" aria-hidden="true" />
            Оценить
          </PressableButton>
        )}
      </div>
    </MotionCard>
  );
}

function formatDate(s: string) {
  try { return new Date(s).toLocaleDateString('ru', { day: 'numeric', month: 'long' }); }
  catch { return s; }
}
