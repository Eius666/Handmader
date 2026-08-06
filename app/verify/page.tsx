'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, BadgeCheck, Clock, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { PressableButton } from '@/components/motion/Pressable';
import { submitVerification } from '@/lib/firestore';

const MIN_EXPERIENCE_LENGTH = 50;
const MAX_PHOTO_URLS = 5;

export default function VerifyPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [experience,      setExperience]      = useState('');
  const [socialLinks,     setSocialLinks]     = useState<string[]>(['']);
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>(['', '', '']);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState(false);

  useEffect(() => {
    if (user?.verificationExperience) setExperience(user.verificationExperience);
    if (user?.verificationSocialLinks?.length) setSocialLinks(user.verificationSocialLinks);
    if (user?.verificationPortfolioPhotos?.length) {
      const photos = [...user.verificationPortfolioPhotos];
      while (photos.length < 3) photos.push('');
      setPortfolioPhotos(photos);
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const status = user.verificationStatus ?? 'none';

  // ── Already verified ────────────────────────────────────────────────────────
  if (status === 'verified') {
    return (
      <PageLayout title="Верификация" showBack>
        <div className="flex flex-col items-center gap-5 px-5 pt-10 text-center">
          <div
            className="flex size-20 items-center justify-center rounded-full"
            style={{ background: 'rgb(var(--success-rgb) / 12%)' }}
          >
            <BadgeCheck size={44} strokeWidth={1.8} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <h2 className="font-display text-[22px] font-bold text-foreground" style={{ margin: '0 0 6px' }}>
              Вы проверенный мастер
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Ваш профиль проверен командой Handmader. Клиенты видят бейдж «Проверен» рядом с вашим именем.
            </p>
          </div>
          <PressableButton
            onClick={() => router.back()}
            className="btn-primary"
            style={{ maxWidth: 280 }}
          >
            Назад в профиль
          </PressableButton>
        </div>
      </PageLayout>
    );
  }

  // ── Pending ─────────────────────────────────────────────────────────────────
  if (status === 'pending') {
    const submittedAt = user.verificationSubmittedAt
      ? user.verificationSubmittedAt.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;
    return (
      <PageLayout title="Верификация" showBack>
        <div className="flex flex-col items-center gap-5 px-5 pt-10 text-center">
          <div
            className="flex size-20 items-center justify-center rounded-full"
            style={{ background: 'rgb(var(--primary-rgb) / 0.10)' }}
          >
            <Clock size={40} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 className="font-display text-[22px] font-bold text-foreground" style={{ margin: '0 0 6px' }}>
              Заявка на рассмотрении
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Мы проверяем ваши данные и свяжемся с вами.
              {submittedAt && <><br />Подана: {submittedAt}</>}
            </p>
          </div>
          <div
            className="w-full max-w-sm rounded-2xl p-4 text-left text-[13px] text-muted-foreground leading-relaxed"
            style={{ background: 'rgb(var(--primary-rgb) / 0.05)', border: '1px solid rgb(var(--primary-rgb) / 0.12)' }}
          >
            Обычно рассмотрение занимает 1-3 дня. Результат придёт уведомлением в Telegram.
          </div>
          <PressableButton onClick={() => router.back()} className="btn-outline" style={{ maxWidth: 280 }}>
            Назад
          </PressableButton>
        </div>
      </PageLayout>
    );
  }

  // ── Form (none | rejected) ───────────────────────────────────────────────────

  const canSubmit = experience.trim().length >= MIN_EXPERIENCE_LENGTH && !submitting;

  async function handleSubmit() {
    if (!user || !canSubmit) return;
    setError('');
    setSubmitting(true);
    try {
      await submitVerification(user.uid, user.displayName, {
        experience: experience.trim(),
        socialLinks: socialLinks.filter(Boolean),
        portfolioPhotos: portfolioPhotos.filter(Boolean),
      });
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <PageLayout title="Верификация" showBack>
        <div className="flex flex-col items-center gap-5 px-5 pt-10 text-center">
          <div
            className="flex size-20 items-center justify-center rounded-full"
            style={{ background: 'rgb(var(--primary-rgb) / 0.10)' }}
          >
            <Clock size={40} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 className="font-display text-[22px] font-bold text-foreground" style={{ margin: '0 0 6px' }}>
              Заявка отправлена!
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              Мы рассмотрим вашу заявку в течение 1-3 дней и пришлём уведомление.
            </p>
          </div>
          <PressableButton onClick={() => router.back()} className="btn-primary" style={{ maxWidth: 280 }}>
            Отлично
          </PressableButton>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Верификация" showBack>
      <div className="flex flex-col gap-5 px-5 pb-10 pt-4">

        {/* Hero */}
        <div
          className="flex flex-col gap-2 rounded-2xl p-5"
          style={{ background: 'rgb(var(--success-rgb) / 0.06)', border: '1px solid rgb(var(--success-rgb) / 0.14)' }}
        >
          <div className="flex items-center gap-3">
            <BadgeCheck size={26} strokeWidth={1.8} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <h2 className="font-display text-[17px] font-bold" style={{ color: 'var(--success)', margin: 0 }}>
              Стать проверенным мастером
            </h2>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--success)', margin: 0 }}>
            Проверенные мастера получают бейдж «Проверен» в откликах и профиле — это увеличивает доверие клиентов.
          </p>
        </div>

        {/* Rejection reason */}
        {status === 'rejected' && user.verificationRejectionReason && (
          <div
            className="flex gap-3 rounded-2xl p-4"
            style={{ background: 'rgb(var(--danger-rgb) / 0.06)', border: '1px solid rgb(var(--danger-rgb) / 0.14)' }}
          >
            <AlertCircle size={18} strokeWidth={2} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-[13px] font-bold" style={{ color: 'var(--danger)', margin: '0 0 3px' }}>
                Предыдущая заявка отклонена
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--danger)', margin: 0 }}>
                {user.verificationRejectionReason}
              </p>
            </div>
          </div>
        )}

        {/* Experience */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-foreground">
            Расскажите об опыте
          </label>
          <p className="text-[12px] text-muted-foreground" style={{ margin: 0 }}>
            Сколько лет вяжете, какие техники знаете, где учились, что умеете делать
          </p>
          <textarea
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="Например: вяжу спицами и крючком уже 8 лет. Умею делать жаккард, амигуруми, изделия на заказ по меркам..."
            rows={5}
            className="input-field"
            style={{ resize: 'vertical', minHeight: 120 }}
          />
          <p
            className="text-[11px]"
            style={{ color: experience.trim().length >= MIN_EXPERIENCE_LENGTH ? 'var(--success)' : 'var(--muted-foreground)', margin: 0 }}
          >
            {experience.trim().length} / {MIN_EXPERIENCE_LENGTH} символов минимум
          </p>
        </div>

        {/* Social links */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-foreground">
            Ссылки на работы{' '}
            <span className="text-[12px] font-normal text-muted-foreground">(необязательно)</span>
          </label>
          <p className="text-[12px] text-muted-foreground" style={{ margin: 0 }}>
            Instagram, ВКонтакте, Livemaster, личный сайт — всё что покажет ваши работы
          </p>
          <div className="flex flex-col gap-2">
            {socialLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    value={link}
                    onChange={(e) =>
                      setSocialLinks((prev) => prev.map((l, j) => (j === i ? e.target.value : l)))
                    }
                    placeholder="https://..."
                    className="input-field"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
                {socialLinks.length > 1 && (
                  <PressableButton
                    type="button"
                    onClick={() => setSocialLinks((prev) => prev.filter((_, j) => j !== i))}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95"
                    style={{ background: 'rgb(var(--primary-rgb) / 0.08)', color: 'var(--muted-foreground)' }}
                    aria-label="Удалить ссылку"
                  >
                    <X size={14} aria-hidden="true" />
                  </PressableButton>
                )}
              </div>
            ))}
          </div>
          {socialLinks.length < 5 && (
            <PressableButton
              type="button"
              onClick={() => setSocialLinks((prev) => [...prev, ''])}
              className="flex items-center gap-2 self-start rounded-full px-4 py-2 text-[13px] font-semibold transition-all active:scale-95"
              style={{ background: 'rgb(var(--primary-rgb) / 0.08)', color: 'var(--primary)' }}
            >
              <Plus size={14} aria-hidden="true" />
              Добавить ссылку
            </PressableButton>
          )}
        </div>

        {/* Portfolio photos */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-foreground">
            Фото ваших работ{' '}
            <span className="text-[12px] font-normal text-muted-foreground">(необязательно)</span>
          </label>
          <p className="text-[12px] text-muted-foreground" style={{ margin: 0 }}>
            Прямые ссылки на фотографии (можно использовать Imgur, Google Photos и т.п.)
          </p>
          <div className="flex flex-col gap-2">
            {portfolioPhotos.map((url, i) => (
              <input
                key={i}
                value={url}
                onChange={(e) =>
                  setPortfolioPhotos((prev) => prev.map((u, j) => (j === i ? e.target.value : u)))
                }
                placeholder={`Ссылка на фото ${i + 1} (https://...)`}
                className="input-field"
              />
            ))}
          </div>
          {portfolioPhotos.length < MAX_PHOTO_URLS && (
            <PressableButton
              type="button"
              onClick={() => setPortfolioPhotos((prev) => [...prev, ''])}
              className="flex items-center gap-2 self-start rounded-full px-4 py-2 text-[13px] font-semibold transition-all active:scale-95"
              style={{ background: 'rgb(var(--primary-rgb) / 0.08)', color: 'var(--primary)' }}
            >
              <Plus size={14} aria-hidden="true" />
              Ещё фото
            </PressableButton>
          )}
        </div>

        {error && (
          <p className="text-center text-[13px] font-semibold text-primary">{error}</p>
        )}

        <PressableButton
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary"
        >
          {submitting ? 'Отправляем...' : status === 'rejected' ? 'Подать заявку повторно' : 'Отправить заявку'}
        </PressableButton>

        <p className="text-center text-[12px] text-muted-foreground leading-relaxed">
          Рассмотрение занимает 1-3 дня. Вы получите уведомление в Telegram.
        </p>
      </div>
    </PageLayout>
  );
}
