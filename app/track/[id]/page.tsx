'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Send, Wallet, Package, Trash2, MessageSquare } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { Toast } from '@/components/ui/Toast';
import { RatingModal } from '@/components/RatingModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { getOrder, startWork, markReady, confirmDelivery, submitRating, deleteOrder } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useTelegram } from '@/hooks/useTelegram';
import { Order, OrderStatus, CATEGORY_LABELS } from '@/types';

type StepState = 'done' | 'active' | 'todo';

interface Step {
  id: string;
  label: string;
  status: OrderStatus;
  state: StepState;
}

function buildSteps(currentStatus: OrderStatus): Step[] {
  const steps: { id: string; label: string; status: OrderStatus }[] = [
    { id: 'accepted',   label: 'Принят',   status: 'master_selected' },
    { id: 'inprogress', label: 'В работе', status: 'in_progress' },
    { id: 'ready',      label: 'Готов',    status: 'ready' },
    { id: 'delivered',  label: 'Доставлен', status: 'delivered' },
  ];

  const ORDER: OrderStatus[] = ['master_selected', 'in_progress', 'ready', 'delivered', 'completed'];
  const currentIdx = ORDER.indexOf(currentStatus);

  return steps.map((step) => {
    const stepIdx = ORDER.indexOf(step.status);
    let state: StepState = 'todo';
    if (stepIdx < currentIdx) state = 'done';
    else if (stepIdx === currentIdx) state = 'active';
    return { ...step, state };
  });
}

const STATUS_META: Partial<Record<OrderStatus, { icon: string; text: string; sub: string }>> = {
  master_selected: { icon: '🤝', text: 'Принят',   sub: 'Мастер подтвердил заказ и готовится приступить' },
  in_progress:     { icon: '🧶', text: 'В работе', sub: 'Мастер приступил к вязанию вашего заказа' },
  ready:           { icon: '✅', text: 'Готово!',  sub: 'Ваш заказ выполнен и ждёт передачи' },
  delivered:       { icon: '📦', text: 'Доставлен', sub: 'Заказ доставлен, ожидаем подтверждения' },
  completed:       { icon: '⭐', text: 'Завершён', sub: 'Спасибо! Не забудьте оставить отзыв' },
};

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { openTelegramChat } = useTelegram();
  const router = useRouter();

  const [order,       setOrder]       = useState<Order | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [acting,      setActing]      = useState(false);
  const [toast,       setToast]       = useState('');
  const [showRating,  setShowRating]  = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  useEffect(() => {
    if (!id) return;
    getOrder(id).then(setOrder).finally(() => setLoading(false));
  }, [id]);

  const isOwner    = order?.customerId      === user?.uid;
  const isMaster   = !isOwner && order?.selectedMasterId === user?.uid;
  const canConfirm = isOwner && (order?.status === 'ready' || order?.status === 'delivered');
  const canDelete  = isOwner && !!order && ['awaiting_responses', 'master_selected'].includes(order.status);

  async function handleStart() {
    if (!order) return;
    setActing(true);
    try {
      await startWork(order.id);
      setOrder((p) => p ? { ...p, status: 'in_progress' } : p);
      setToast('Статус обновлён: В работе');
    } finally { setActing(false); }
  }

  async function handleReady() {
    if (!order) return;
    setActing(true);
    try {
      await markReady(order.id);
      setOrder((p) => p ? { ...p, status: 'ready' } : p);
      setToast('Мастер сообщил что заказ готов');
    } finally { setActing(false); }
  }

  async function handleConfirm() {
    if (!order) return;
    console.log('[handleConfirm] called, orderId:', order.id, 'status:', order.status, 'selectedMasterId:', order.selectedMasterId);
    setActing(true);
    try {
      await confirmDelivery(order.id);
      setOrder((p) => p ? { ...p, status: 'completed' } : p);
      setToast('Заказ завершён');
      if (order.selectedMasterId) setShowRating(true);
    } finally { setActing(false); }
  }

  async function handleDelete() {
    if (!order) return;
    setDeleting(true);
    try {
      await deleteOrder(order.id);
      setToast('Заказ удалён');
      setTimeout(() => router.replace('/orders'), 1000);
    } catch {
      setToast('Не удалось удалить заказ');
      setDeleting(false);
    }
    setShowDelete(false);
  }

  async function handleRatingSend(rating: number, comment: string) {
    if (!order?.selectedMasterId || !user) return;
    await submitRating(order.id, order.selectedMasterId, user.uid, rating, comment);
    setShowRating(false);
    setToast('Спасибо за оценку!');
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <span className="size-9 rounded-full border-2 border-secondary border-t-primary animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Заказ не найден</p>
        <button onClick={() => router.back()} className="text-primary font-semibold">← Назад</button>
      </div>
    );
  }

  const steps     = buildSteps(order.status);
  const statusInfo = STATUS_META[order.status] ?? { icon: '🧶', text: order.status, sub: '' };
  const selectedResp = order.selectedMasterId ? order.responses?.[order.selectedMasterId] : null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="shrink-0 flex items-center gap-4 px-5 pb-2 pt-4">
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          className="flex size-11 items-center justify-center rounded-full bg-card text-foreground shadow-[0_4px_16px_rgba(45,45,45,0.06)] transition-colors active:bg-secondary"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-2xl font-extrabold text-foreground">
          {CATEGORY_LABELS[order.category]}
        </h1>
        {order.selectedMasterId && (isOwner || isMaster) && (
          <button
            type="button"
            aria-label="Открыть чат"
            onClick={() => router.push(`/chat/${order.id}`)}
            className="flex size-10 items-center justify-center rounded-full bg-card text-primary shadow-[0_4px_16px_rgba(45,45,45,0.06)] transition-all active:scale-95"
          >
            <MessageSquare className="size-4" aria-hidden="true" />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            aria-label="Удалить заказ"
            onClick={() => setShowDelete(true)}
            className="flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_4px_16px_rgba(45,45,45,0.06)] transition-all active:scale-95 active:text-red-600"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto pb-28 [&::-webkit-scrollbar]:hidden">
      <div className="flex flex-col gap-6 px-5 pt-4">
        {/* Status icon */}
        <section className="flex flex-col items-center gap-3 pt-2">
          <div className="flex size-28 items-center justify-center rounded-full bg-primary shadow-[0_10px_30px_rgba(224,122,95,0.4)] text-5xl">
            {statusInfo.icon}
          </div>
          <p className="text-2xl font-extrabold text-foreground">{statusInfo.text}</p>
          <p className="px-4 text-center text-sm text-muted-foreground">{statusInfo.sub}</p>
        </section>

        {/* Stepper */}
        <section
          aria-label="Прогресс заказа"
          className="rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgba(45,45,45,0.06)]"
        >
          <ol className="flex items-start justify-between">
            {steps.map((step, idx) => (
              <li key={step.id} className="relative flex flex-1 flex-col items-center gap-2">
                {idx < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 top-4 h-1 w-full -translate-y-1/2 rounded-full ${
                      step.state === 'done' ? 'bg-status-progress' : 'bg-secondary'
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 flex size-8 items-center justify-center rounded-full ${
                    step.state === 'done'
                      ? 'bg-status-progress text-status-progress-foreground'
                      : step.state === 'active'
                      ? 'bg-primary'
                      : 'bg-secondary'
                  }`}
                >
                  {step.state === 'done' ? (
                    <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                  ) : step.state === 'active' ? (
                    <span className="relative flex size-3">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                      <span className="relative inline-flex size-3 rounded-full bg-primary-foreground" />
                    </span>
                  ) : (
                    <span className="size-2.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                  )}
                </span>
                <span
                  className={`text-center text-xs font-semibold leading-tight ${
                    step.state === 'todo' ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Master card */}
        {selectedResp && (
          <section className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-[0_4px_20px_rgba(45,45,45,0.06)]">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-secondary">
              {selectedResp.masterPhoto ? (
                <Image
                  src={selectedResp.masterPhoto}
                  alt={selectedResp.masterName}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-xl font-bold text-primary">
                  {selectedResp.masterName?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-base font-bold text-foreground">{selectedResp.masterName}</p>
              <div className="flex items-center gap-1">
                <StarRating value={Math.round(selectedResp.masterRating)} size={14} />
                <span className="text-xs text-muted-foreground">· ваш мастер</span>
              </div>
            </div>
            {isOwner && order.selectedMasterId && (
              <button
                type="button"
                onClick={() => openTelegramChat(order.selectedMasterId!)}
                className="flex shrink-0 items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(34,158,217,0.35)] transition-transform active:scale-95"
              >
                <Send className="size-4" aria-hidden="true" />
                Связаться
              </button>
            )}
          </section>
        )}

        {/* Order summary */}
        <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgba(45,45,45,0.06)]">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Package className="size-5 text-primary" aria-hidden="true" />
            Детали заказа
          </h2>
          <p className="text-base leading-relaxed text-foreground">{order.description}</p>

          {order.photos && order.photos.length > 0 && (
            <ImageCarousel photos={order.photos} />
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Wallet className="size-4 text-primary" aria-hidden="true" />
              {order.selectedPrice ? 'Цена мастера' : 'Бюджет'}
            </span>
            <span className="text-lg font-extrabold text-primary">
              {(order.selectedPrice ?? order.budgetMax).toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </section>
      </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
        {order.status === 'completed' ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-status-progress/15 py-4 text-lg font-bold text-status-progress">
            ✓ Заказ завершён
          </div>
        ) : isMaster && order.status === 'master_selected' ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={acting}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white shadow-[0_8px_24px_rgba(224,122,95,0.4)] transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ background: '#d96c52' }}
          >
            {acting ? 'Обновляем...' : '▶ Начать работу'}
          </button>
        ) : isMaster && order.status === 'in_progress' ? (
          <button
            type="button"
            onClick={handleReady}
            disabled={acting}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white shadow-[0_8px_24px_rgba(74,124,89,0.4)] transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ background: '#4a7c59' }}
          >
            {acting ? 'Обновляем...' : '✓ Заказ готов'}
          </button>
        ) : canConfirm ? (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={acting}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white shadow-[0_8px_24px_rgba(74,124,89,0.4)] transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ background: '#4a7c59' }}
          >
            <Check className="size-5" strokeWidth={3} aria-hidden="true" />
            {acting ? 'Подтверждаем...' : 'Подтвердить получение'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full rounded-xl bg-secondary py-4 text-base font-bold text-foreground"
          >
            ← Назад к заказам
          </button>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      {showRating && (
        <RatingModal
          masterName={order?.responses?.[order.selectedMasterId!]?.masterName}
          onSend={handleRatingSend}
          onSkip={() => setShowRating(false)}
        />
      )}

      {showDelete && (
        <ConfirmModal
          title="Удалить заказ?"
          body={order.description.length > 80
            ? order.description.slice(0, 80) + '…'
            : order.description}
          confirmLabel="Удалить"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
