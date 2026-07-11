'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { Spinner } from '@/components/ui/Spinner';
import { getAvailableOrders } from '@/lib/firestore';
import { Order, OrderCategory, CATEGORY_LABELS } from '@/types';

const FILTER_OPTIONS: { key: OrderCategory | ''; label: string; emoji: string }[] = [
  { key: '', label: 'Все', emoji: '✨' },
  { key: 'hat', label: 'Шапки', emoji: '🧢' },
  { key: 'sweater', label: 'Свитера', emoji: '🧥' },
  { key: 'scarf', label: 'Шарфы', emoji: '🧣' },
  { key: 'toy', label: 'Игрушки', emoji: '🐻' },
  { key: 'accessory', label: 'Аксессуары', emoji: '👜' },
  { key: 'other', label: 'Другое', emoji: '❓' },
];

const EMOJI_MAP: Record<string, string> = {
  hat: '🧢', sweater: '🧥', scarf: '🧣', toy: '🐻', accessory: '👜', other: '✨',
};

export default function FeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderCategory | ''>('');

  useEffect(() => {
    setLoading(true);
    getAvailableOrders(filter || undefined)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <PageLayout title="Лента заказов">
      {/* Filter chips */}
      <div
        style={{
          padding: '12px 20px',
          overflowX: 'auto',
          display: 'flex',
          gap: 8,
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 14px',
              borderRadius: 20,
              border: 'none',
              background: filter === opt.key ? 'var(--accent)' : 'var(--border)',
              color: filter === opt.key ? '#FFFFFF' : 'var(--text)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <Spinner size={32} />
          </div>
        ) : orders.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              paddingTop: 80,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 64 }}>🧶</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Заказов пока нет
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, maxWidth: 240 }}>
              Попробуйте другую категорию или загляните позже
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {orders.map((order) => (
              <div
                key={order.id}
                className="card"
                style={{ padding: 16 }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'var(--bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    {EMOJI_MAP[order.category]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
                      {CATEGORY_LABELS[order.category]}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      от {order.customerName}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 8,
                      padding: '4px 8px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text)',
                      flexShrink: 0,
                    }}
                  >
                    {Object.keys(order.responses || {}).length} откл.
                  </div>
                </div>

                {/* Description */}
                <p
                  style={{
                    margin: '0 0 12px',
                    fontSize: 13,
                    color: 'var(--text)',
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {order.description}
                </p>

                {/* Details */}
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                    marginBottom: 14,
                    paddingTop: 10,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <Chip emoji="💰" text={`${order.budgetMin.toLocaleString('ru')} — ${order.budgetMax.toLocaleString('ru')} ₽`} />
                  <Chip emoji="📅" text={`до ${formatDate(order.deadline)}`} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '11px 16px', fontSize: 14 }}
                  >
                    Подробнее
                  </button>
                  <button
                    onClick={() => router.push(`/orders/${order.id}/respond`)}
                    className="btn-primary"
                    style={{ flex: 2, padding: '11px 16px', fontSize: 14 }}
                  >
                    Откликнуться
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function Chip({ emoji, text }: { emoji: string; text: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'var(--bg)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 12,
        color: 'var(--text)',
      }}
    >
      {emoji} {text}
    </span>
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
