'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { getCustomerOrders } from '@/lib/firestore';
import { Order, CATEGORY_LABELS } from '@/types';

const EMOJI_MAP: Record<string, string> = {
  hat: '🧢', sweater: '🧥', scarf: '🧣', toy: '🐻', accessory: '👜', other: '✨',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getCustomerOrders(user.uid)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <PageLayout title="Мои заказы">
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
            <div style={{ fontSize: 64 }}>📋</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Заказов пока нет
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
              Создайте первый заказ и найдите своего мастера
            </p>
            <button
              className="btn-primary"
              onClick={() => router.push('/orders/new')}
              style={{ width: 'auto', marginTop: 8, padding: '13px 32px' }}
            >
              Создать заказ
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => router.push(`/orders/${order.id}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '16px',
                  background: '#FFFFFF',
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 2px 12px rgba(45,45,45,0.06)',
                  width: '100%',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'var(--bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {EMOJI_MAP[order.category]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>
                      {CATEGORY_LABELS[order.category]}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {order.description}
                    </div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Bottom row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>
                    💰 {order.budgetMin.toLocaleString('ru')} — {order.budgetMax.toLocaleString('ru')} ₽
                  </span>
                  <span>📅 до {formatDate(order.deadline)}</span>
                  <span>
                    💬 {Object.keys(order.responses || {}).length} откл.
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
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
