'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, RefreshCw, ShieldCheck, X } from 'lucide-react';

import { PageLayout } from '@/components/layout/PageLayout';
import { Spinner } from '@/components/ui/Spinner';
import {
  decideVerification,
  getPendingVerifications,
  getStaffActor,
  type StaffActorDto,
  type VerificationApplicationDto,
} from '@/lib/staff';

export default function StaffVerificationsPage() {
  const [staff, setStaff] = useState<StaffActorDto | null>(null);
  const [applications, setApplications] = useState<VerificationApplicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    // Keep the initial effect asynchronous before it updates local UI state.
    await Promise.resolve();
    setLoading(true);
    setError('');
    try {
      const [actor, queue] = await Promise.all([getStaffActor(), getPendingVerifications()]);
      setStaff(actor);
      setApplications(queue);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить очередь');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([getStaffActor(), getPendingVerifications()])
      .then(([actor, queue]) => {
        setStaff(actor);
        setApplications(queue);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить очередь');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDecision(
    application: VerificationApplicationDto,
    decision: 'approve' | 'reject',
  ) {
    const reason = decision === 'reject'
      ? rejectionReasons[application.userId]?.trim()
      : undefined;
    if (decision === 'reject' && (!reason || reason.length < 5)) {
      setError('Для отказа укажите причину не короче 5 символов');
      return;
    }
    setBusyUserId(application.userId);
    setError('');
    try {
      await decideVerification(application.userId, decision, reason);
      setApplications((current) => current.filter((item) => item.userId !== application.userId));
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Не удалось сохранить решение');
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <PageLayout
      title="Проверка мастеров"
      showBack
      hideNav
      headerRight={(
        <button
          type="button"
          aria-label="Обновить очередь"
          onClick={() => void load()}
          className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </button>
      )}
    >
      <main className="flex flex-col gap-4 px-5 py-5">
        <Link href="/staff/reselections" className="text-sm font-bold text-primary">
          Перейти к обращениям о смене мастера
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

        {!loading && !error && applications.length === 0 && (
          <section className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <ShieldCheck className="size-10 text-primary" aria-hidden="true" />
            <p className="font-bold text-foreground">Очередь пуста</p>
            <p className="text-sm text-muted-foreground">Новых заявок на проверку нет.</p>
          </section>
        )}

        {!loading && !error && applications.map((application) => (
          <article key={application.userId} className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <div>
              <p className="font-display text-lg font-semibold text-foreground">{application.displayName || 'Без имени'}</p>
              <p className="text-sm text-muted-foreground">{application.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Подано {formatDate(application.submittedAt)}</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Опыт</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{application.experience || 'Не указан'}</p>
            </div>

            {application.socialLinks.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Социальные сети</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {application.socialLinks.map((link) => <li key={link} className="break-all text-sm text-foreground">{link}</li>)}
                </ul>
              </div>
            )}

            {application.evidencePhotos.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Материалы проверки</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {application.evidencePhotos.map((photo, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={`${index}-${photo.slice(0, 24)}`} src={photo} alt={`Материал ${index + 1}`} className="aspect-square w-full rounded-xl object-cover" />
                  ))}
                </div>
              </div>
            )}

            {staff?.role === 'admin' ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-bold text-foreground">
                  Причина отказа
                  <textarea
                    className="input-field min-h-20 font-normal"
                    value={rejectionReasons[application.userId] ?? ''}
                    onChange={(event) => setRejectionReasons((current) => ({
                      ...current,
                      [application.userId]: event.target.value,
                    }))}
                    placeholder="Мастер увидит этот текст"
                    maxLength={1_000}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={busyUserId === application.userId}
                    onClick={() => void handleDecision(application, 'reject')}
                    className="flex items-center justify-center gap-2 rounded-xl border border-status-danger/30 py-3 font-bold text-status-danger disabled:opacity-50"
                  >
                    <X className="size-4" aria-hidden="true" /> Отказать
                  </button>
                  <button
                    type="button"
                    disabled={busyUserId === application.userId}
                    onClick={() => void handleDecision(application, 'approve')}
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <Check className="size-4" aria-hidden="true" /> Одобрить
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
                Сотрудник поддержки может изучить заявку; окончательное решение принимает администратор.
              </p>
            )}
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
