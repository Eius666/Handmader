'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { Spinner } from '@/components/ui/Spinner';
import { Ruler } from 'lucide-react';
import { getOrder, addResponse } from '@/lib/firestore';
import { ImageCarousel } from '@/components/ui/ImageCarousel';
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

    if (user.role !== 'master' && user.role !== 'both') {
      setError('Только мастера могут откликаться на заказы');
      return;
    }

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
        masterCompletedOrders: masterProfile?.completedOrders ?? 0,
        masterVerified: user.verificationStatus === 'verified',
        price: priceNum,
        timeline: timeline.trim(),
        comment: comment.trim(),
        portfolioPhotos,
      });
      setSuccess(true);
      setTimeout(() => router.replace(`/orders/${order.id}`), 1500);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Не удалось отправить отклик. Попробуйте снова.');
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

  const alreadyResponded = Boolean(user && order.responses && user.uid in order.responses);

  if (alreadyResponded) {
    return (
      <PageLayout showBack title="Отклик на заказ">
        <div
          className="mx-5 mt-10 flex flex-col items-center gap-4 rounded-2xl p-8 text-center"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(180,100,70,0.08)',
            boxShadow: '0 4px 16px rgba(45,45,45,0.06)',
          }}
        >
          <div
            className="flex size-16 items-center justify-center rounded-full text-3xl"
            style={{ background: 'rgba(194,112,62,0.1)' }}
          >
            ✓
          </div>
          <h2 className="text-lg font-extrabold text-foreground">Вы уже откликнулись</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Вы уже отправили отклик на этот заказ.
            <br />
            Заказчик рассматривает его.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: '#C2703E', boxShadow: '0 4px 14px rgba(194,112,62,0.35)' }}
          >
            Назад
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showBack title="Отклик на заказ">
      <div className="flex flex-col gap-4 px-5 pb-8 pt-4">

        {/* Order summary */}
        <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-4 shadow-[0_4px_16px_rgba(45,45,45,0.06)]">
          <span className="text-xs font-medium text-muted-foreground">Заказ</span>
          <span className="text-base font-bold text-foreground">{CATEGORY_LABELS[order.category]}</span>
          <p className="text-sm leading-relaxed text-foreground" style={{ margin: 0 }}>
            {order.description}
          </p>
          <div className="flex flex-wrap gap-3 pt-1 text-xs font-medium text-muted-foreground">
            <span>💰 {order.budgetMin.toLocaleString('ru')} — {order.budgetMax.toLocaleString('ru')} ₽</span>
            <span>📅 до {formatDate(order.deadline)}</span>
          </div>
        </div>

        {/* Reference photos */}
        {order.photos && order.photos.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl bg-card p-4 shadow-[0_4px_16px_rgba(45,45,45,0.06)]">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Фото от клиента
            </span>
            <ImageCarousel photos={order.photos} height="h-40" />
          </div>
        )}

        {/* Measurements — prominently shown so master doesn't miss them */}
        {order.measurements && (
          <div
            className="flex gap-3 rounded-2xl p-4"
            style={{
              background: 'rgba(194,112,62,0.08)',
              border: '1.5px solid rgba(194,112,62,0.25)',
            }}
          >
            <Ruler className="mt-0.5 size-4 shrink-0" style={{ color: '#C2703E' }} aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: '#C2703E' }}>
                Мерки клиента
              </span>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {order.measurements}
              </p>
            </div>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center shadow-[0_4px_16px_rgba(45,45,45,0.06)]">
            <span className="text-5xl">✅</span>
            <span className="text-lg font-bold text-foreground">Отклик отправлен!</span>
            <span className="text-sm text-muted-foreground">Заказчик получит уведомление</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-4 shadow-[0_4px_16px_rgba(45,45,45,0.06)]">
              <label className="text-sm font-bold text-foreground">Ваша цена (₽)</label>
              <input
                className="input-field"
                type="number"
                placeholder={`${order.budgetMin} — ${order.budgetMax}`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={1}
                required
              />
              <p className="text-xs text-muted-foreground" style={{ margin: 0 }}>
                Бюджет заказчика: {order.budgetMin.toLocaleString('ru')} — {order.budgetMax.toLocaleString('ru')} ₽
              </p>
            </div>

            <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-4 shadow-[0_4px_16px_rgba(45,45,45,0.06)]">
              <label className="text-sm font-bold text-foreground">Срок выполнения</label>
              <input
                className="input-field"
                type="text"
                placeholder="Например: 2 недели, 10 дней"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-4 shadow-[0_4px_16px_rgba(45,45,45,0.06)]">
              <label className="text-sm font-bold text-foreground">Комментарий</label>
              <textarea
                className="input-field"
                placeholder="Расскажите о себе, опыте, почему вы подойдёте для этого заказа..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>

            {error && (
              <p className="text-center text-sm font-semibold text-primary" style={{ margin: 0 }}>
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
    return new Date(dateStr).toLocaleDateString('ru', { day: 'numeric', month: 'long' });
  } catch {
    return dateStr;
  }
}
