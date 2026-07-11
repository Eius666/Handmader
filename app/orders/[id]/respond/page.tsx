'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { Spinner } from '@/components/ui/Spinner';
import { getOrder, addResponse } from '@/lib/firestore';
import { Order, CATEGORY_LABELS } from '@/types';

export default function RespondPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState('');
  const [timeline, setTimeline] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !user) return;

    const priceNum = Number(price);
    if (!priceNum || priceNum <= 0) {
      setError('Укажите корректную цену');
      return;
    }
    if (!timeline.trim()) {
      setError('Укажите срок выполнения');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const masterProfile = user.masterProfile;
      const portfolioPhotos = masterProfile?.portfolioPhotos?.slice(0, 3) ?? [];

      await addResponse(order.id, user.uid, {
        masterId: user.uid,
        masterName: user.displayName,
        masterPhoto: masterProfile?.portfolioPhotos?.[0],
        masterRating: masterProfile?.rating ?? 0,
        price: priceNum,
        timeline: timeline.trim(),
        comment: comment.trim(),
        portfolioPhotos,
      });
      setSuccess(true);
      setTimeout(() => router.replace(`/orders/${order.id}`), 1500);
    } catch (err) {
      console.error(err);
      setError('Не удалось отправить отклик. Попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
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
      <PageLayout showBack title="Откликнуться">
        <p style={{ textAlign: 'center', paddingTop: 60 }}>Заказ не найден</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout showBack title="Отклик на заказ">
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Order summary */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Заказ</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
            {CATEGORY_LABELS[order.category]}
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)', lineHeight: 1.45 }}>
            {order.description}
          </p>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)' }}>
            <span>💰 {order.budgetMin.toLocaleString('ru')} — {order.budgetMax.toLocaleString('ru')} ₽</span>
            <span>📅 до {formatDate(order.deadline)}</span>
          </div>
        </div>

        {success ? (
          <div
            className="card"
            style={{ padding: 32, textAlign: 'center', color: 'var(--success)' }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Отклик отправлен!</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
              Заказчик получит уведомление
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: 18 }}>
              <label style={{ fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 10 }}>
                Ваша цена (₽)
              </label>
              <input
                className="input-field"
                type="number"
                placeholder={`${order.budgetMin} — ${order.budgetMax}`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={1}
                required
              />
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '6px 0 0' }}>
                Бюджет заказчика: {order.budgetMin.toLocaleString('ru')} — {order.budgetMax.toLocaleString('ru')} ₽
              </p>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <label style={{ fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 10 }}>
                Срок выполнения
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="Например: 2 недели, 10 дней"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                required
              />
            </div>

            <div className="card" style={{ padding: 18 }}>
              <label style={{ fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 10 }}>
                Комментарий
              </label>
              <textarea
                className="input-field"
                placeholder="Расскажите о себе, опыте, почему вы подойдёте для этого заказа..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>

            {error && (
              <p style={{ color: 'var(--accent)', fontWeight: 600, margin: 0, textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Отправляем...' : 'Отправить отклик'}
            </button>
          </form>
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
