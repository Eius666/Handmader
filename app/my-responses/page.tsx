'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { Order, CATEGORY_LABELS } from '@/types';

const EMOJI_MAP: Record<string, string> = {
  hat: '🧢', sweater: '🧥', scarf: '🧣', toy: '🐻', accessory: '👜', other: '✨',
};

interface ResponseEntry {
  order: Order;
  myPrice: number;
  myTimeline: string;
  isSelected: boolean;
}

export default function MyResponsesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<ResponseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        // Get orders where this master has responded
        const allOrdersSnap = await getDocs(
          query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
        );

        const result: ResponseEntry[] = [];
        for (const d of allOrdersSnap.docs) {
          const data = d.data();
          const responses = data.responses as Record<string, { price: number; timeline: string }> | undefined;
          if (responses && user!.uid in responses) {
            const resp = responses[user!.uid];
            result.push({
              order: {
                ...data,
                id: d.id,
                createdAt: data.createdAt?.toDate() ?? new Date(),
              } as Order,
              myPrice: resp.price,
              myTimeline: resp.timeline,
              isSelected: data.selectedMasterId === user!.uid,
            });
          }
        }
        setEntries(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  return (
    <PageLayout title="Мои отклики">
      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <Spinner size={32} />
          </div>
        ) : entries.length === 0 ? (
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
            <div style={{ fontSize: 64 }}>📩</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Откликов пока нет
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
              Перейдите в ленту и откликнитесь на первый заказ!
            </p>
            <button
              className="btn-primary"
              onClick={() => router.push('/feed')}
              style={{ width: 'auto', marginTop: 8, padding: '13px 32px' }}
            >
              Открыть ленту
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {entries.map(({ order, myPrice, myTimeline, isSelected }) => (
              <button
                key={order.id}
                onClick={() => router.push(`/orders/${order.id}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '16px',
                  background: isSelected ? '#F5FAF7' : '#FFFFFF',
                  borderRadius: 16,
                  border: isSelected ? '2px solid var(--success)' : '2px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 2px 12px rgba(45,45,45,0.06)',
                  width: '100%',
                }}
              >
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
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
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
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>💰 Ваша цена: {myPrice.toLocaleString('ru')} ₽</span>
                  <span>⏱️ {myTimeline}</span>
                  {isSelected && (
                    <span style={{ color: '#2E7D32', fontWeight: 600 }}>✓ Вас выбрали!</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
