'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shirt, HardHat, Wind, Baby, Sparkles, Package, Plus, Star, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BottomNav } from '@/components/layout/BottomNav';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RatingModal } from '@/components/RatingModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Toast } from '@/components/ui/Toast';
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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 sm:px-8 lg:px-12 pb-3 pt-8">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-0.5">
            Мои
          </p>
          <h1 className="text-[26px] sm:text-[30px] font-extrabold tracking-[-0.03em] text-foreground leading-none">
            Заказы
          </h1>
        </div>
        <button
          onClick={() => router.push('/orders/new')}
          aria-label="Новый заказ"
          className="flex size-11 items-center justify-center rounded-full text-white transition-all duration-200 active:scale-95"
          style={{ background: '#d96c52', boxShadow: '0 4px 14px rgba(217,108,82,0.35)' }}
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* Tabs */}
      <div
        className="mx-5 sm:mx-8 lg:mx-12 mt-1 mb-4 flex w-fit gap-1 rounded-xl p-1 min-w-[240px] max-w-sm"
        style={{ background: 'rgba(180,100,70,0.07)' }}
      >
        {(['active', 'completed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-2.5 text-[13px] font-bold transition-all duration-250"
            style={{
              background: tab === t ? '#ffffff' : 'transparent',
              color: tab === t ? '#d96c52' : '#78716c',
              boxShadow: tab === t ? '0 2px 8px rgba(140,80,50,0.1)' : 'none',
              transition: 'all 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {t === 'active' ? 'Активные' : 'Завершённые'}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 px-5 sm:px-8 lg:px-12 pb-28 items-start">
        {loading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl"
                style={{
                  height: 90,
                  background: 'rgba(180,100,70,0.06)',
                  border: '1px solid rgba(180,100,70,0.06)',
                }}
              />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div
            className="col-span-full flex flex-col items-center gap-3 rounded-2xl py-14 text-center"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(180,100,70,0.08)',
              boxShadow: '0 2px 12px rgba(140,80,50,0.06)',
            }}
          >
            <span className="text-5xl">📋</span>
            <p className="text-[14px] font-semibold text-muted-foreground">
              {tab === 'active' ? 'Активных заказов нет' : 'Завершённых заказов нет'}
            </p>
            {tab === 'active' && (
              <button
                onClick={() => router.push('/orders/new')}
                className="mt-1 rounded-full px-6 py-2.5 text-[13px] font-bold text-white transition-all active:scale-95"
                style={{ background: '#d96c52', boxShadow: '0 4px 14px rgba(217,108,82,0.3)' }}
              >
                Создать заказ
              </button>
            )}
          </div>
        ) : (
          filtered.map((order) => {
            const canRate =
              order.status === 'completed' &&
              !!order.selectedMasterId &&
              !order.ratings?.some((r) => r.userId === user?.uid);
            const canDelete = DELETABLE.includes(order.status);
            return (
              <OrderListCard
                key={order.id}
                order={order}
                onClick={() => handleCardClick(order)}
                canRate={canRate}
                onRate={() => setRatingOrder(order)}
                canDelete={canDelete}
                onDelete={() => setDeleteTarget(order)}
              />
            );
          })
        )}
      </section>

      <BottomNav />

      {ratingOrder && (
        <RatingModal
          masterName={ratingOrder.selectedMasterName}
          onSend={handleRatingSend}
          onSkip={() => setRatingOrder(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Удалить заказ?"
          body={deleteTarget.description.length > 80
            ? deleteTarget.description.slice(0, 80) + '…'
            : deleteTarget.description}
          confirmLabel="Удалить"
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </main>
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
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="flex flex-col gap-3 w-full text-left cursor-pointer transition-all duration-200 active:scale-[0.98]"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(180,100,70,0.08)',
        borderRadius: 18,
        padding: '14px 16px',
        boxShadow: '0 2px 10px rgba(140,80,50,0.06)',
      }}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(217,108,82,0.1)' }}
        >
          <Icon className="size-5 text-primary" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium text-muted-foreground tracking-wide">
            {CATEGORY_LABELS[order.category]}
          </span>
          <p className="line-clamp-2 text-[13px] font-bold leading-snug text-foreground">
            {order.description}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={order.status} />
          {canDelete && (
            <button
              type="button"
              aria-label="Удалить заказ"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="flex size-7 items-center justify-center rounded-full transition-colors active:scale-95"
              style={{ color: '#a8a29e' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#c0392b')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#a8a29e')}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom meta row */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-[11px] font-medium text-muted-foreground"
        style={{ borderTop: '1px solid rgba(180,100,70,0.08)' }}
      >
        <span>
          {order.budgetMin.toLocaleString('ru-RU')} — {order.budgetMax.toLocaleString('ru-RU')} ₽
        </span>
        <span>до {formatDate(order.deadline)}</span>
        {responseCount > 0 && (
          <span className="font-bold text-primary ml-auto">{responseCount} откл.</span>
        )}
        {canRate && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRate?.(); }}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-white transition-all active:scale-95"
            style={{ background: '#C2703E', boxShadow: '0 2px 8px rgba(194,112,62,0.35)' }}
          >
            <Star className="size-3 fill-current" aria-hidden="true" />
            Оценить
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(s: string) {
  try { return new Date(s).toLocaleDateString('ru', { day: 'numeric', month: 'long' }); }
  catch { return s; }
}
