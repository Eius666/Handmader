'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, CalendarClock, Ruler } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { MasterResponseCard } from '@/components/ui/MasterResponseCard';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
import { Toast } from '@/components/ui/Toast';
import { getOrder, selectMaster } from '@/lib/firestore';
import { Order, OrderResponse, CATEGORY_LABELS } from '@/types';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingMaster, setSelectingMaster] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const isOwner = order?.customerId === user?.uid;

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSelectMaster(masterId: string, resp: OrderResponse) {
    if (!order) return;
    setSelectingMaster(masterId);
    try {
      await selectMaster(order.id, masterId, resp.masterName, resp.price);
      setToast('Мастер выбран!');
      setTimeout(() => router.replace(`/track/${order.id}`), 1500);
    } finally {
      setSelectingMaster(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <span className="size-9 rounded-full border-2 border-secondary border-t-primary animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Заказ не найден</p>
        <button onClick={() => router.back()} className="text-primary font-semibold">← Назад</button>
      </div>
    );
  }

  const responses = Object.entries(order.responses ?? {});
  const isMasterSelected = !!order.selectedMasterId;

  // If order is in active state, redirect to tracking
  if (['in_progress', 'ready', 'delivered'].includes(order.status)) {
    router.replace(`/track/${order.id}`);
    return null;
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background pb-10">
      <header className="flex items-center gap-4 px-5 pb-2 pt-4">
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          className="flex size-11 items-center justify-center rounded-full bg-card text-foreground shadow-[0_4px_16px_rgba(45,45,45,0.06)] transition-colors active:bg-secondary"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-extrabold text-foreground">
          {CATEGORY_LABELS[order.category]}
        </h1>
      </header>

      <div className="flex flex-col gap-6 px-5 pt-4">
        {/* Order info card */}
        <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgba(45,45,45,0.06)]">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/12 px-3 py-1 text-sm font-bold text-primary">
            {CATEGORY_LABELS[order.category]}
          </span>

          <p className="text-base leading-relaxed text-foreground">{order.description}</p>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground">
              <Wallet className="size-4 text-primary" aria-hidden="true" />
              {order.budgetMin.toLocaleString('ru-RU')} — {order.budgetMax.toLocaleString('ru-RU')} ₽
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground">
              <CalendarClock className="size-4 text-primary" aria-hidden="true" />
              до {formatDate(order.deadline)}
            </span>
          </div>

          {/* Photos */}
          {order.photos && order.photos.length > 0 && (
            <ImageCarousel photos={order.photos} />
          )}
        </section>

        {/* Measurements */}
        {order.measurements && (
          <section
            className="flex gap-3 rounded-2xl p-4"
            style={{
              background: 'rgba(194,112,62,0.06)',
              border: '1px solid rgba(194,112,62,0.15)',
            }}
          >
            <Ruler className="mt-0.5 size-4 shrink-0" style={{ color: '#C2703E' }} aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#C2703E' }}>
                Мерки клиента
              </span>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {order.measurements}
              </p>
            </div>
          </section>
        )}

        {/* Master selected banner */}
        {isMasterSelected && order.status === 'master_selected' && (
          <section className="flex items-center gap-3 rounded-2xl bg-status-progress/10 p-4 border border-status-progress/30">
            <span className="text-2xl">✓</span>
            <div>
              <p className="font-bold text-foreground">Мастер выбран!</p>
              <p className="text-sm text-muted-foreground">
                {order.selectedMasterName} приступит к работе
              </p>
            </div>
            <button
              onClick={() => router.push(`/track/${order.id}`)}
              className="ml-auto shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              Трекинг
            </button>
          </section>
        )}

        {/* Responses */}
        {isOwner && order.status === 'awaiting_responses' && (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-foreground">
              Отклики мастеров{' '}
              <span className="text-primary">({responses.length})</span>
            </h2>

            {responses.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center shadow-[0_4px_20px_rgba(45,45,45,0.06)]">
                <span className="text-5xl">⏳</span>
                <p className="text-base font-semibold text-muted-foreground">
                  Ожидаем откликов мастеров...
                </p>
                <p className="text-sm text-muted-foreground">
                  Обычно первые отклики приходят в течение часа
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {responses.map(([masterId, resp]) => (
                  <li key={masterId}>
                    <MasterResponseCard
                      masterId={masterId}
                      response={resp}
                      onSelect={isOwner ? () => handleSelectMaster(masterId, resp) : undefined}
                      isSelecting={selectingMaster === masterId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Selected master responses */}
        {isMasterSelected && order.status === 'master_selected' && (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-foreground">Выбранный мастер</h2>
            <MasterResponseCard
              masterId={order.selectedMasterId!}
              response={order.responses[order.selectedMasterId!]}
              selected
            />
          </section>
        )}

        {/* Respond button for master */}
        {!isOwner && (user?.role === 'master' || user?.role === 'both') && order.status === 'awaiting_responses' && (
          <button
            onClick={() => router.push(`/orders/${order.id}/respond`)}
            className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-[0_8px_24px_rgba(224,122,95,0.4)] transition-transform active:scale-[0.98]"
          >
            Откликнуться на заказ
          </button>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

function formatDate(s: string) {
  try { return new Date(s).toLocaleDateString('ru', { day: 'numeric', month: 'long' }); }
  catch { return s; }
}
