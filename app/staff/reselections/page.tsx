'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';

import { PageLayout } from '@/components/layout/PageLayout';
import { Spinner } from '@/components/ui/Spinner';
import {
  getPendingReselections,
  reopenMasterSelection,
  type ReselectionCaseDto,
} from '@/lib/staff';

export default function StaffReselectionsPage() {
  const [cases, setCases] = useState<ReselectionCaseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCases(await getPendingReselections());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить обращения');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void getPendingReselections()
      .then(setCases)
      .catch((loadError) => setError(
        loadError instanceof Error ? loadError.message : 'Не удалось загрузить обращения',
      ))
      .finally(() => setLoading(false));
  }, []);

  async function handleReopen(item: ReselectionCaseDto) {
    setBusyCaseId(item.id);
    setError('');
    try {
      await reopenMasterSelection(item.id);
      setCases((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch (reopenError) {
      setError(reopenError instanceof Error ? reopenError.message : 'Не удалось открыть повторный выбор');
    } finally {
      setBusyCaseId(null);
    }
  }

  return (
    <PageLayout
      title="Смена мастера"
      showBack
      hideNav
      headerRight={(
        <button
          type="button"
          aria-label="Обновить обращения"
          onClick={() => void load()}
          className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </button>
      )}
    >
      <main className="flex flex-col gap-4 px-5 py-5">
        <Link href="/staff/verifications" className="text-sm font-bold text-primary">
          Перейти к проверке мастеров
        </Link>

        {loading && <div className="flex justify-center py-16"><Spinner size={36} /></div>}

        {!loading && error && (
          <section className="rounded-2xl border border-status-danger/30 bg-status-danger/10 p-4">
            <p className="font-semibold text-foreground">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-3 font-bold text-primary">
              Повторить
            </button>
          </section>
        )}

        {!loading && !error && cases.length === 0 && (
          <section className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <ShieldCheck className="size-10 text-primary" aria-hidden="true" />
            <p className="font-bold text-foreground">Обращений нет</p>
            <p className="text-sm text-muted-foreground">Новых запросов на смену мастера пока нет.</p>
          </section>
        )}

        {!loading && !error && cases.map((item) => (
          <article key={item.id} className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <div>
              <p className="font-display text-lg font-semibold text-foreground">
                Заказ №{item.orderId.slice(0, 8)}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.orderTitle}</p>
              <p className="mt-2 text-xs text-muted-foreground">Подано {formatDate(item.requestedAt)}</p>
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-secondary p-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Заказчик</dt>
                <dd className="font-semibold text-foreground">{item.customerAlias}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Текущий мастер</dt>
                <dd className="font-semibold text-foreground">{item.previousMasterAlias}</dd>
              </div>
            </dl>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Причина</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.reason}</p>
            </div>

            <button
              type="button"
              disabled={busyCaseId === item.id}
              onClick={() => void handleReopen(item)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {busyCaseId === item.id ? 'Открываем...' : 'Открыть повторный выбор'}
            </button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Прежний мастер будет исключён. Остальным мастерам придёт запрос подтвердить цену и срок в течение 48 часов.
            </p>
          </article>
        ))}
      </main>
    </PageLayout>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU');
}
