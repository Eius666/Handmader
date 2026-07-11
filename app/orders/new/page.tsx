'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { createOrder } from '@/lib/firestore';
import { OrderCategory, CATEGORY_LABELS } from '@/types';

const CATEGORIES: { key: OrderCategory; emoji: string }[] = [
  { key: 'hat', emoji: '🧢' },
  { key: 'sweater', emoji: '🧥' },
  { key: 'scarf', emoji: '🧣' },
  { key: 'toy', emoji: '🐻' },
  { key: 'accessory', emoji: '👜' },
  { key: 'other', emoji: '✨' },
];

function NewOrderForm() {
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get('category') as OrderCategory) || '';

  const [category, setCategory] = useState<OrderCategory | ''>(initialCategory);
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState(500);
  const [budgetMax, setBudgetMax] = useState(3000);
  const [deadline, setDeadline] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const router = useRouter();

  function addPhotoUrl() {
    if (photoUrls.length >= 5) return;
    setPhotoUrls((prev) => [...prev, '']);
  }

  function updatePhotoUrl(index: number, value: string) {
    setPhotoUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }

  function removePhotoUrl(index: number) {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!category) { setError('Выберите категорию'); return; }
    if (!description.trim()) { setError('Добавьте описание'); return; }
    if (!deadline) { setError('Укажите срок выполнения'); return; }

    setError('');
    setLoading(true);
    try {
      const cleanPhotos = photoUrls.filter((u) => u.trim() !== '');
      const id = await createOrder({
        customerId: user.uid,
        customerName: user.displayName,
        description: description.trim(),
        category: category as OrderCategory,
        photos: cleanPhotos,
        budgetMin,
        budgetMax,
        deadline,
      });
      router.replace(`/orders/${id}`);
    } catch (err) {
      console.error(err);
      setError('Не удалось создать заказ. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <PageLayout title="Новый заказ" showBack hideNav={false}>
      <form onSubmit={handleSubmit} style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Category */}
        <div className="card" style={{ padding: 18 }}>
          <label style={{ fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 12 }}>
            Категория
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 6px',
                  borderRadius: 12,
                  border: category === cat.key ? '2px solid var(--accent)' : '2px solid transparent',
                  background: category === cat.key ? '#FFF0EB' : 'var(--bg)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                  {CATEGORY_LABELS[cat.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="card" style={{ padding: 18 }}>
          <label style={{ fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 10 }}>
            Описание заказа
          </label>
          <textarea
            className="input-field"
            placeholder="Что хотите создать? Укажите размер, цвет, пряжу, особые пожелания..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />
        </div>

        {/* Budget */}
        <div className="card" style={{ padding: 18 }}>
          <label style={{ fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 10 }}>
            Бюджет
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 10,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>от</span>
              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--accent)' }}>
                {budgetMin.toLocaleString('ru')} ₽
              </span>
            </div>
            <span style={{ color: 'var(--text-muted)' }}>—</span>
            <div
              style={{
                background: 'var(--bg)',
                borderRadius: 10,
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>до</span>
              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--accent)' }}>
                {budgetMax.toLocaleString('ru')} ₽
              </span>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Минимум
            </div>
            <input
              type="range"
              min={200}
              max={budgetMax}
              step={100}
              value={budgetMin}
              onChange={(e) => setBudgetMin(Number(e.target.value))}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Максимум
            </div>
            <input
              type="range"
              min={budgetMin}
              max={50000}
              step={100}
              value={budgetMax}
              onChange={(e) => setBudgetMax(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Deadline */}
        <div className="card" style={{ padding: 18 }}>
          <label style={{ fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 10 }}>
            Нужно готово к
          </label>
          <input
            className="input-field"
            type="date"
            value={deadline}
            min={today}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </div>

        {/* Photo references */}
        <div className="card" style={{ padding: 18 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <label style={{ fontWeight: 700, fontSize: 15 }}>
              Фото-референсы (URL)
            </label>
            {photoUrls.length < 5 && (
              <button
                type="button"
                onClick={addPhotoUrl}
                style={{
                  background: 'var(--bg)',
                  border: 'none',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  borderRadius: 8,
                  padding: '4px 10px',
                }}
              >
                + Добавить
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {photoUrls.map((url, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input-field"
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => updatePhotoUrl(i, e.target.value)}
                  style={{ flex: 1 }}
                />
                {photoUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhotoUrl(i)}
                    style={{
                      background: '#FFF0EB',
                      border: 'none',
                      color: 'var(--accent)',
                      borderRadius: 10,
                      padding: '0 12px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      fontSize: 16,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '8px 0 0' }}>
            Вставьте ссылки на фото из интернета или Instagram
          </p>
        </div>

        {error && (
          <p style={{ color: 'var(--accent)', fontWeight: 600, margin: 0, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Публикуем...' : 'Опубликовать заказ 🚀'}
        </button>
      </form>
    </PageLayout>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Загрузка...</div>}>
      <NewOrderForm />
    </Suspense>
  );
}
