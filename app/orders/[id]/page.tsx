'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTelegram } from '@/hooks/useTelegram';
import { PageLayout } from '@/components/layout/PageLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StarRating } from '@/components/ui/StarRating';
import { Spinner } from '@/components/ui/Spinner';
import { getOrder, selectMaster, updateOrderStatus } from '@/lib/firestore';
import { Order, OrderResponse, CATEGORY_LABELS, STATUS_STEPS } from '@/types';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { openTelegramChat } = useTelegram();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingMaster, setSelectingMaster] = useState<string | null>(null);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  const isOwner = order?.customerId === user?.uid;
  const isMaster = order?.selectedMasterId === user?.uid;

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then((o) => setOrder(o))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSelectMaster(masterId: string, response: OrderResponse) {
    if (!order || !user) return;
    setSelectingMaster(masterId);
    try {
      await selectMaster(order.id, masterId, response.masterName, response.price);
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: 'master_selected',
              selectedMasterId: masterId,
              selectedMasterName: response.masterName,
              selectedPrice: response.price,
            }
          : prev
      );
    } finally {
      setSelectingMaster(null);
    }
  }

  async function handleConfirmDelivery() {
    if (!order) return;
    setConfirmingDelivery(true);
    try {
      await updateOrderStatus(order.id, 'completed');
      setOrder((prev) => (prev ? { ...prev, status: 'completed' } : prev));
    } finally {
      setConfirmingDelivery(false);
    }
  }

  async function handleAdvanceStatus() {
    if (!order) return;
    const idx = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]);
    if (idx < 0 || idx >= STATUS_STEPS.length - 1) return;
    const next = STATUS_STEPS[idx + 1];
    await updateOrderStatus(order.id, next);
    setOrder((prev) => (prev ? { ...prev, status: next } : prev));
  }

  if (loading) {
    return (
      <PageLayout showBack title="">
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Spinner size={36} />
        </div>
      </PageLayout>
    );
  }

  if (!order) {
    return (
      <PageLayout showBack title="Заказ">
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <p>Заказ не найден</p>
        </div>
      </PageLayout>
    );
  }

  const responses = Object.entries(order.responses || {});
  const selectedResponse = order.selectedMasterId
    ? order.responses[order.selectedMasterId]
    : null;

  const isActive = order.status !== 'awaiting_responses' && order.status !== 'completed';
  const stepIdx = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]);

  return (
    <PageLayout showBack title={CATEGORY_LABELS[order.category]}>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Status */}
        <div className="card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div style={{ marginBottom: 6 }}>
              <StatusBadge status={order.status} />
            </div>
            {isActive && (
              <div style={{ marginTop: 12 }}>
                <ProgressBar steps={STATUS_STEPS.slice(0, -1)} currentIdx={stepIdx - 1} />
              </div>
            )}
          </div>
        </div>

        {/* Order info */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700 }}>Описание</h3>
          <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
            {order.description}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <InfoChip emoji="💰" text={`${order.budgetMin.toLocaleString('ru')} — ${order.budgetMax.toLocaleString('ru')} ₽`} />
            <InfoChip emoji="📅" text={`до ${formatDate(order.deadline)}`} />
          </div>

          {order.photos && order.photos.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>
                Референсы
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {order.photos.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      width: 70,
                      height: 70,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <img
                      src={url}
                      alt={`ref-${i}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected master block */}
        {selectedResponse && (
          <div
            className="card"
            style={{
              padding: 18,
              border: '2px solid var(--success)',
              background: '#F5FAF7',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#2E7D32' }}>
              ✓ Мастер выбран
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: 'var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {selectedResponse.masterPhoto ? (
                  <img
                    src={selectedResponse.masterPhoto}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  '🧶'
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {selectedResponse.masterName}
                </div>
                <StarRating value={selectedResponse.masterRating} size={14} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <InfoChip emoji="💰" text={`${selectedResponse.price.toLocaleString('ru')} ₽`} />
              <InfoChip emoji="⏱️" text={selectedResponse.timeline} />
            </div>

            {selectedResponse.masterPhoto && (
              <button
                onClick={() => openTelegramChat(order.selectedMasterId!)}
                className="btn-primary"
                style={{ marginBottom: 10 }}
              >
                💬 Связаться в Telegram
              </button>
            )}

            {isOwner && order.status === 'ready' && (
              <button
                className="btn-primary"
                onClick={handleConfirmDelivery}
                disabled={confirmingDelivery}
                style={{ background: 'var(--success)' }}
              >
                {confirmingDelivery ? 'Подтверждаем...' : '✓ Подтвердить получение'}
              </button>
            )}

            {!isOwner && isMaster && isActive && order.status !== 'ready' && order.status !== 'delivered' && (
              <button
                className="btn-secondary"
                onClick={handleAdvanceStatus}
              >
                Обновить статус →
              </button>
            )}
          </div>
        )}

        {/* Responses */}
        {isOwner && order.status === 'awaiting_responses' && (
          <div>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>
              Отклики мастеров ({responses.length})
            </h3>
            {responses.length === 0 ? (
              <div
                className="card"
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
                Ожидаем откликов мастеров...
                <br />
                Обычно первые отклики приходят в течение часа.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {responses.map(([masterId, resp]) => (
                  <ResponseCard
                    key={masterId}
                    masterId={masterId}
                    response={resp}
                    onSelect={() => handleSelectMaster(masterId, resp)}
                    isSelecting={selectingMaster === masterId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Respond button for master */}
        {!isOwner && user?.role !== 'customer' && order.status === 'awaiting_responses' && (
          <button
            className="btn-primary"
            onClick={() => router.push(`/orders/${order.id}/respond`)}
          >
            Откликнуться на заказ
          </button>
        )}
      </div>
    </PageLayout>
  );
}

function ResponseCard({
  masterId,
  response,
  onSelect,
  isSelecting,
}: {
  masterId: string;
  response: OrderResponse;
  onSelect: () => void;
  isSelecting: boolean;
}) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {response.masterPhoto ? (
            <img
              src={response.masterPhoto}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            '🧶'
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
            {response.masterName}
          </div>
          <StarRating value={response.masterRating} size={14} />
        </div>
      </div>

      {response.comment && (
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text)', lineHeight: 1.45 }}>
          {response.comment}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <InfoChip emoji="💰" text={`${response.price.toLocaleString('ru')} ₽`} />
        <InfoChip emoji="⏱️" text={response.timeline} />
      </div>

      {response.portfolioPhotos && response.portfolioPhotos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {response.portfolioPhotos.slice(0, 3).map((url, i) => (
            <div
              key={i}
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                overflow: 'hidden',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}
            >
              <img
                src={url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                }}
              />
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={onSelect}
        disabled={isSelecting}
        style={{ fontSize: 14, padding: '11px 20px' }}
      >
        {isSelecting ? 'Выбираем...' : '✓ Выбрать этого мастера'}
      </button>
    </div>
  );
}

function InfoChip({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'var(--bg)',
        borderRadius: 8,
        padding: '5px 10px',
        fontSize: 13,
        color: 'var(--text)',
        fontWeight: 500,
      }}
    >
      <span>{emoji}</span>
      <span>{text}</span>
    </div>
  );
}

function ProgressBar({ steps, currentIdx }: { steps: readonly string[]; currentIdx: number }) {
  const LABELS: Record<string, string> = {
    master_selected: 'Принят',
    in_progress: 'В работе',
    ready: 'Готов',
    delivered: 'Доставлен',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((step, i) => {
        const done = i <= currentIdx;
        const current = i === currentIdx;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: done ? 'var(--accent)' : 'var(--border)',
                  border: current ? '2px solid var(--accent)' : 'none',
                  transition: 'background 0.3s',
                }}
              />
              <div
                style={{
                  fontSize: 9,
                  color: done ? 'var(--accent)' : 'var(--text-muted)',
                  marginTop: 3,
                  fontWeight: done ? 600 : 400,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {LABELS[step] ?? step}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  height: 2,
                  flex: 2,
                  background: i < currentIdx ? 'var(--accent)' : 'var(--border)',
                  marginBottom: 16,
                  transition: 'background 0.3s',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}
