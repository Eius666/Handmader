'use client';

import { useRef, useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Camera, Calendar, Ruler, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { createOrder } from '@/lib/firestore';
import { OrderCategory, CATEGORY_LABELS } from '@/types';

const CATEGORIES: { key: OrderCategory; label: string }[] = [
  { key: 'hat',       label: 'Шапки' },
  { key: 'sweater',   label: 'Свитеры' },
  { key: 'scarf',     label: 'Шарфы' },
  { key: 'toy',       label: 'Игрушки' },
  { key: 'accessory', label: 'Аксессуары' },
  { key: 'other',     label: 'Другое' },
];

const MAX_PHOTOS = 5;

function NewOrderFormInner() {
  const searchParams = useSearchParams();
  const initialCat = (searchParams.get('category') as OrderCategory) || 'hat';

  const [selectedCategory, setSelectedCategory] = useState<OrderCategory>(initialCat);
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deadline, setDeadline] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [measurements, setMeasurements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const remaining = MAX_PHOTOS - photos.length;
    const urls = Array.from(files)
      .slice(0, remaining)
      .map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...urls]);
    e.target.value = '';
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index]);
      next.splice(index, 1);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!description.trim()) { setError('Добавьте описание'); return; }
    if (!deadline) { setError('Укажите срок'); return; }
    const min = Number(budgetMin) || 500;
    const max = Number(budgetMax) || 3000;
    setError('');
    setSubmitting(true);
    try {
      const id = await createOrder({
        customerId: user.uid,
        customerName: user.displayName,
        description: description.trim(),
        category: selectedCategory,
        photos: [],          // file upload → Storage not configured in MVP
        budgetMin: min,
        budgetMax: Math.max(min, max),
        deadline,
        ...(measurements.trim() ? { measurements: measurements.trim() } : {}),
      });
      router.replace(`/orders/${id}`);
    } catch (err) {
      console.error(err);
      setError('Не удалось создать заказ. Попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-4 px-5 pb-2 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Назад"
          className="flex size-11 items-center justify-center rounded-full bg-card text-foreground shadow-[0_4px_16px_rgba(45,45,45,0.06)] transition-colors active:bg-secondary"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-extrabold text-foreground">Новый заказ</h1>
      </header>

      {/* Scrollable form area — header stays fixed, submit button is `fixed` at bottom */}
      <div className="scrollbar-none flex-1 overflow-y-auto">
      <form
        id="new-order-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-7 px-5 pb-40 pt-4"
      >
        {/* Category */}
        <section className="flex flex-col gap-3">
          <label className="text-base font-bold text-foreground">Категория</label>
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 scrollbar-none">
            {CATEGORIES.map(({ key, label }) => {
              const isActive = key === selectedCategory;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedCategory(key)}
                  aria-pressed={isActive}
                  className={cn(
                    'shrink-0 rounded-full px-5 py-2.5 text-base font-semibold transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(224,122,95,0.35)]'
                      : 'bg-card text-muted-foreground',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Description */}
        <section className="flex flex-col gap-3">
          <label htmlFor="desc" className="text-base font-bold text-foreground">
            Описание
          </label>
          <textarea
            id="desc"
            rows={5}
            placeholder="Опишите что хотите: размер, цвет, пряжа..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-none rounded-2xl bg-card px-5 py-4 text-base font-medium text-foreground shadow-[0_4px_16px_rgba(45,45,45,0.05)] outline-none placeholder:font-medium placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
            required
          />
        </section>

        {/* Photo upload (preview only; Storage not configured) */}
        <section className="flex flex-col gap-3">
          <label className="text-base font-bold text-foreground">
            Фото{' '}
            <span className="font-medium text-muted-foreground">
              ({photos.length}/{MAX_PHOTOS})
            </span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 py-8 text-primary transition-colors active:bg-primary/10 disabled:opacity-50"
          >
            <Camera className="size-8" aria-hidden="true" />
            <span className="text-base font-semibold">Добавить фото</span>
          </button>

          {photos.length > 0 && (
            <ul className="flex flex-wrap gap-3 pt-1">
              {photos.map((src, i) => (
                <li key={src} className="relative size-20 overflow-hidden rounded-2xl">
                  <Image
                    src={src}
                    alt={`Фото ${i + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={`Удалить фото ${i + 1}`}
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-foreground/70 text-background"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Budget */}
        <section className="flex flex-col gap-3">
          <label className="text-base font-bold text-foreground">Бюджет</label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                inputMode="numeric"
                placeholder="От"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                aria-label="Бюджет от"
                className="w-full rounded-2xl bg-card py-4 pl-5 pr-9 text-base font-semibold text-foreground shadow-[0_4px_16px_rgba(45,45,45,0.05)] outline-none placeholder:font-medium placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
              />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">₽</span>
            </div>
            <div className="relative flex-1">
              <input
                type="number"
                inputMode="numeric"
                placeholder="До"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                aria-label="Бюджет до"
                className="w-full rounded-2xl bg-card py-4 pl-5 pr-9 text-base font-semibold text-foreground shadow-[0_4px_16px_rgba(45,45,45,0.05)] outline-none placeholder:font-medium placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
              />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">₽</span>
            </div>
          </div>
        </section>

        {/* Deadline */}
        <section className="flex flex-col gap-3">
          <label htmlFor="deadline" className="text-base font-bold text-foreground">
            Срок выполнения
          </label>
          <div className="relative">
            <input
              id="deadline"
              type="date"
              min={today}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full appearance-none rounded-2xl bg-card py-4 pl-5 pr-12 text-base font-semibold text-foreground shadow-[0_4px_16px_rgba(45,45,45,0.05)] outline-none focus:ring-2 focus:ring-primary/40 [&::-webkit-calendar-picker-indicator]:opacity-0"
              required
            />
            <Calendar className="pointer-events-none absolute right-5 top-1/2 size-5 -translate-y-1/2 text-primary" aria-hidden="true" />
          </div>
        </section>

        {/* Measurements */}
        <section className="flex flex-col gap-3">
          <label htmlFor="measurements" className="flex items-center gap-2 text-base font-bold text-foreground">
            <Ruler className="size-5 text-primary" aria-hidden="true" />
            Ваши мерки
          </label>
          <textarea
            id="measurements"
            rows={3}
            placeholder="Рост: 170 см, Обхват груди: 90 см, Обхват талии: 70 см..."
            value={measurements}
            onChange={(e) => setMeasurements(e.target.value)}
            className="w-full resize-y rounded-2xl bg-card px-5 py-4 text-base font-medium text-foreground shadow-[0_4px_16px_rgba(45,45,45,0.05)] outline-none placeholder:font-medium placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-xs font-medium text-muted-foreground">
            Укажите свои размеры, чтобы мастер мог точнее оценить заказ
          </p>
        </section>

        {error && (
          <p className="text-center text-sm font-semibold text-primary">{error}</p>
        )}
      </form>
      </div>{/* end scrollable */}

      {/* Submit — fixed so it's always visible regardless of scroll position */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-border bg-background/95 px-5 pb-8 pt-4 backdrop-blur">
        <button
          type="submit"
          form="new-order-form"
          disabled={submitting}
          className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-[0_8px_24px_rgba(224,122,95,0.4)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? 'Публикуем...' : 'Опубликовать заказ 🚀'}
        </button>
      </div>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-background"><span className="text-muted-foreground">Загрузка...</span></div>}>
      <NewOrderFormInner />
    </Suspense>
  );
}
