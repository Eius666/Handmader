'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getCustomerOrders } from '@/lib/firestore';
import { Order, CATEGORY_LABELS } from '@/types';
import { Spinner } from '@/components/ui/Spinner';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getCustomerOrders(user.uid)
      .then((orders) => setRecentOrders(orders.slice(0, 3)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <PageLayout>
      <div style={{ padding: '24px 20px 0' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 4px' }}>
            Привет, {user?.displayName?.split(' ')[0] || 'друг'} 👋
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Что хотите создать?
          </h1>
        </div>

        {/* Main CTA */}
        <button
          onClick={() => router.push('/orders/new')}
          style={{
            width: '100%',
            background: '#FFFFFF',
            border: '2px dashed #E07A5F',
            borderRadius: 16,
            padding: '18px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            textAlign: 'left',
            transition: 'all 0.15s',
            marginBottom: 28,
            boxShadow: '0 2px 12px rgba(45,45,45,0.06)',
          }}
        >
          <span style={{ fontSize: 36 }}>✏️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 2 }}>
              Описать заказ
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Шапка, свитер, игрушка или что-то особенное
            </div>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 22 }}>→</span>
        </button>

        {/* Categories quick-pick */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px', color: 'var(--text)' }}>
            Популярные категории
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}
          >
            {[
              { emoji: '🧢', label: 'Шапка', key: 'hat' },
              { emoji: '🧥', label: 'Свитер', key: 'sweater' },
              { emoji: '🧣', label: 'Шарф', key: 'scarf' },
              { emoji: '🐻', label: 'Игрушка', key: 'toy' },
              { emoji: '👜', label: 'Аксессуар', key: 'accessory' },
              { emoji: '✨', label: 'Другое', key: 'other' },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => router.push(`/orders/new?category=${cat.key}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '14px 8px',
                  background: '#FFFFFF',
                  borderRadius: 14,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(45,45,45,0.06)',
                  transition: 'transform 0.1s',
                }}
              >
                <span style={{ fontSize: 26 }}>{cat.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Spinner />
          </div>
        ) : recentOrders.length > 0 ? (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Последние заказы
              </h2>
              <button
                onClick={() => router.push('/orders')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Все →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    background: '#FFFFFF',
                    borderRadius: 14,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: '0 2px 8px rgba(45,45,45,0.06)',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: 24 }}>
                    {getEmojiByCategory(order.category)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: 'var(--text)',
                        marginBottom: 3,
                      }}
                    >
                      {CATEGORY_LABELS[order.category]}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
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
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}

function getEmojiByCategory(category: string): string {
  const map: Record<string, string> = {
    hat: '🧢', sweater: '🧥', scarf: '🧣', toy: '🐻', accessory: '👜', other: '✨',
  };
  return map[category] ?? '🧶';
}
