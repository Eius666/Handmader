'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings, MapPin, X, ChevronRight, AlertCircle, Clock, BadgeCheck, LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { PressableButton } from '@/components/motion/Pressable';
import { setUser } from '@/lib/firestore';
import { OrderCategory, CATEGORY_LABELS, MasterProfile, VerificationStatus } from '@/types';

const MASTER_CATS: OrderCategory[] = ['hat', 'sweater', 'scarf', 'toy', 'accessory', 'other'];

// ── Inline rating stars (supports half-star precision) ───────────────────────
function RatingStars({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 5) * 100));
  return (
    <span style={{ position: 'relative', display: 'inline-block', lineHeight: 1 }}>
      <span style={{ color: 'var(--border)', fontSize: 14, letterSpacing: 2 }}>★★★★★</span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: 0, overflow: 'hidden',
          width: `${pct}%`, color: 'var(--gold)', fontSize: 14,
          letterSpacing: 2, whiteSpace: 'nowrap',
        }}
      >
        ★★★★★
      </span>
    </span>
  );
}

// ── Verification footer inside master card ───────────────────────────────────
function VerificationBlock({ status }: { status: VerificationStatus }) {
  if (status === 'verified') return null;

  if (status === 'pending') {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl p-3"
        style={{ background: 'rgb(var(--primary-rgb) / 0.06)', border: '1px solid rgb(var(--primary-rgb) / 0.14)' }}
      >
        <Clock size={16} strokeWidth={1.8} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--accent-dark)' }}>
            Заявка на рассмотрении
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)' }}>Обычно 1–3 дня</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/verify"
      className="flex items-center gap-3 rounded-2xl p-3 transition-all active:scale-[0.98]"
      style={{
        background:     'rgb(var(--success-rgb) / 0.04)',
        border:         '1.5px solid rgb(var(--success-rgb) / 0.20)',
        textDecoration: 'none',
      }}
    >
      {status === 'rejected'
        ? <AlertCircle size={16} strokeWidth={1.8} style={{ color: 'var(--danger)', flexShrink: 0 }} />
        : <BadgeCheck   size={16} strokeWidth={1.8} style={{ color: 'var(--success)', flexShrink: 0 }} />}
      <div className="min-w-0 flex-1">
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>
          {status === 'rejected' ? 'Заявка отклонена — подать снова' : 'Стать проверенным мастером'}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--success)' }}>
          Бейдж повышает доверие клиентов
        </p>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--success)', flexShrink: 0 }} aria-hidden="true" />
    </Link>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, refreshUser, refreshProfile, logout } = useAuth();
  const router = useRouter();

  const [loggingOut,    setLoggingOut]    = useState(false);
  const [editingMaster, setEditingMaster] = useState(false);
  const [savingMaster,  setSavingMaster]  = useState(false);
  const [masterError,   setMasterError]   = useState('');
  const [lightboxSrc,   setLightboxSrc]   = useState<string | null>(null);

  const [bio,  setBio]  = useState('');
  const [cats, setCats] = useState<OrderCategory[]>([]);
  const [urls, setUrls] = useState(['', '', '']);
  const [city, setCity] = useState('');

  useEffect(() => {
    refreshProfile().catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const mp = user.masterProfile;
    setBio(mp?.bio ?? '');
    setCats(mp?.categories ?? []);
    setUrls([mp?.portfolioPhotos?.[0] ?? '', mp?.portfolioPhotos?.[1] ?? '', mp?.portfolioPhotos?.[2] ?? '']);
    setCity(mp?.location ?? '');
    const hasMasterRole = user.role === 'master' || user.role === 'both';
    setEditingMaster(hasMasterRole && !mp);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const isMaster = user.role === 'master' || user.role === 'both';
  const mp = user.masterProfile;
  const verStatus: VerificationStatus = user.verificationStatus ?? 'none';

  async function handleSaveMaster() {
    if (!user) return;
    setSavingMaster(true);
    setMasterError('');
    try {
      const masterProfile: MasterProfile = {
        bio,
        categories: cats,
        portfolioPhotos: urls.filter(Boolean),
        location: city,
        rating:          mp?.rating          ?? 0,
        completedOrders: mp?.completedOrders ?? 0,
      };
      await Promise.race([
        setUser(user.uid, { masterProfile }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore не ответил за 5 секунд')), 5000)
        ),
      ]);
      await refreshUser();
      setEditingMaster(false);
    } catch (err) {
      setMasterError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingMaster(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); router.replace('/auth/login'); }
    finally { setLoggingOut(false); }
  }

  return (
    <PageLayout
      title="Профиль"
      headerRight={
        <Link
          href="/settings"
          aria-label="Настройки"
          style={{ display: 'flex', alignItems: 'center', padding: '4px 0 4px 12px', color: 'var(--text-muted)', textDecoration: 'none' }}
        >
          <Settings size={20} />
        </Link>
      }
    >
      <div className="flex flex-col gap-5 px-5 pb-10 pt-4">

        {/* ══ Non-master identity card ════════════════════════════════════════ */}
        {!isMaster && (
          <div
            className="flex flex-col items-center gap-3 p-6"
            style={{ background: 'var(--card)', border: '1px solid rgb(var(--primary-rgb) / 0.09)', borderRadius: 22, boxShadow: 'var(--shadow-card)' }}
          >
            <div
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-soft))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 800, color: '#fff',
                boxShadow: 'var(--shadow-primary)',
              }}
            >
              {user.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
                {user.displayName}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: 0 }}>{user.email}</p>
            </div>
          </div>
        )}

        {/* ══ Master profile card ══════════════════════════════════════════════ */}
        {isMaster && (
          <div
            style={{
              background:   'var(--card)',
              border:       '1px solid rgb(var(--primary-rgb) / 0.09)',
              borderRadius: 22,
              padding:      20,
              boxShadow:    'var(--shadow-card)',
            }}
          >
            {editingMaster ? (
              /* ── Edit form ──────────────────────────────────────────────── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="flex items-center justify-between">
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
                    Профиль мастера
                  </h3>
                  {mp && (
                    <button
                      onClick={() => { setEditingMaster(false); setMasterError(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', fontSize: 13, cursor: 'pointer', padding: 0 }}
                    >
                      Отмена
                    </button>
                  )}
                </div>

                {!mp && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                    Заполните профиль — заказчики увидят вас в откликах
                  </p>
                )}

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    О себе
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Расскажите об опыте, стиле и техниках..."
                    rows={3}
                    className="input-field"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Категории
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {MASTER_CATS.map((cat) => {
                      const on = cats.includes(cat);
                      return (
                        <PressableButton
                          key={cat}
                          onClick={() => setCats((prev) => on ? prev.filter((c) => c !== cat) : [...prev, cat])}
                          style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                            border:     on ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                            background: on ? 'rgb(var(--primary-rgb) / 0.08)' : 'transparent',
                            color:      on ? 'var(--primary)' : 'var(--muted-foreground)',
                            fontWeight: on ? 700 : 400,
                          }}
                        >
                          {CATEGORY_LABELS[cat]}
                        </PressableButton>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Портфолио (ссылки на фото)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {urls.map((url, i) => (
                      <input
                        key={i}
                        value={url}
                        onChange={(e) => setUrls((prev) => prev.map((u, j) => (j === i ? e.target.value : u)))}
                        placeholder={`Ссылка ${i + 1} (https://...)`}
                        className="input-field"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Город
                  </label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Например, Москва"
                    className="input-field"
                  />
                </div>

                {masterError && (
                  <p style={{ color: 'var(--primary)', fontSize: 13, margin: 0, textAlign: 'center' }}>{masterError}</p>
                )}

                <button onClick={handleSaveMaster} disabled={savingMaster} className="btn-primary">
                  {savingMaster ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </div>

            ) : (
              /* ── View mode ──────────────────────────────────────────────── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* ── Header: avatar + name + badge + city + edit ─────────── */}
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    style={{
                      width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-soft))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 800, color: '#fff',
                      boxShadow: '0 4px 14px rgb(var(--primary-rgb) / 0.30)',
                    }}
                  >
                    {user.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>

                  {/* Name + badge + city */}
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h2
                        className="font-display"
                        style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--foreground)', letterSpacing: '-0.01em', lineHeight: 1.2 }}
                      >
                        {user.displayName}
                      </h2>
                      {verStatus === 'verified' && <VerifiedBadge />}
                    </div>
                    {mp?.location ? (
                      <div className="mt-1 flex items-center gap-1">
                        <MapPin size={11} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} aria-hidden="true" />
                        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{mp.location}</span>
                      </div>
                    ) : (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>
                        {user.email}
                      </p>
                    )}
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={() => { setEditingMaster(true); setMasterError(''); }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, flexShrink: 0,
                    }}
                  >
                    Изменить
                  </button>
                </div>

                {/* ── Divider ─────────────────────────────────────────────── */}
                <div style={{ height: 1, background: 'rgb(var(--primary-rgb) / 0.08)', margin: '18px 0' }} />

                {/* ── Stats row ───────────────────────────────────────────── */}
                <div className="flex items-stretch">
                  {/* Rating */}
                  <div className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className="font-display"
                      style={{ fontSize: 30, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}
                    >
                      {(mp?.rating ?? 0) > 0 ? (mp!.rating.toFixed(1)) : '—'}
                    </span>
                    {(mp?.rating ?? 0) > 0
                      ? <RatingStars value={mp!.rating} />
                      : <span style={{ fontSize: 14, color: 'var(--border)', letterSpacing: 2 }}>★★★★★</span>
                    }
                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 1 }}>
                      {(mp?.ratingCount ?? 0) > 0 ? `${mp!.ratingCount} оценок` : 'нет оценок'}
                    </span>
                  </div>

                  {/* Vertical divider */}
                  <div style={{ width: 1, background: 'rgb(var(--primary-rgb) / 0.10)', margin: '0 16px' }} />

                  {/* Completed orders */}
                  <div className="flex flex-1 flex-col items-center gap-1">
                    <span
                      className="font-display"
                      style={{ fontSize: 30, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}
                    >
                      {mp?.completedOrders ?? 0}
                    </span>
                    {/* invisible stars placeholder for alignment */}
                    <span style={{ fontSize: 14, color: 'transparent', letterSpacing: 2 }} aria-hidden="true">★★★★★</span>
                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)', textAlign: 'center', marginTop: 1 }}>
                      {(mp?.completedOrders ?? 0) === 0 ? 'пока нет заказов' : 'заказов выполнено'}
                    </span>
                  </div>
                </div>

                {/* ── Bio ─────────────────────────────────────────────────── */}
                {mp?.bio && (
                  <>
                    <div style={{ height: 1, background: 'rgb(var(--primary-rgb) / 0.08)', margin: '18px 0' }} />
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--foreground)', lineHeight: 1.65 }}>
                      {mp.bio}
                    </p>
                  </>
                )}

                {/* ── Categories ──────────────────────────────────────────── */}
                {mp?.categories && mp.categories.length > 0 && (
                  <>
                    <div style={{ height: 1, background: 'rgb(var(--primary-rgb) / 0.08)', margin: '18px 0' }} />
                    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>
                      Категории
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                      {mp.categories.map((cat) => (
                        <span
                          key={cat}
                          className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold"
                          style={{
                            background:    'rgb(var(--primary-rgb) / 0.07)',
                            border:        '1px solid rgb(var(--primary-rgb) / 0.18)',
                            color:         'var(--primary)',
                            whiteSpace:    'nowrap',
                          }}
                        >
                          {CATEGORY_LABELS[cat]}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* ── Portfolio ────────────────────────────────────────────── */}
                {mp?.portfolioPhotos && mp.portfolioPhotos.length > 0 && (
                  <>
                    <div style={{ height: 1, background: 'rgb(var(--primary-rgb) / 0.08)', margin: '18px 0' }} />
                    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-foreground)' }}>
                      Портфолио
                    </p>
                    <Stagger className="grid grid-cols-3 gap-2">
                      {mp.portfolioPhotos.map((src, i) => (
                        <StaggerItem key={i}>
                          <PressableButton
                            type="button"
                            onClick={() => setLightboxSrc(src)}
                            aria-label={`Открыть фото ${i + 1}`}
                            className="aspect-square w-full overflow-hidden rounded-xl"
                            style={{ background: 'rgb(var(--primary-rgb) / 0.06)', display: 'block' }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt={`Работа ${i + 1}`}
                              className="h-full w-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </PressableButton>
                        </StaggerItem>
                      ))}
                    </Stagger>
                  </>
                )}

                {/* ── Empty state ──────────────────────────────────────────── */}
                {!mp?.bio && !mp?.location && (!mp?.categories || mp.categories.length === 0) && (
                  <p style={{ fontSize: 13, color: 'var(--muted-foreground)', fontStyle: 'italic', margin: '8px 0 0', textAlign: 'center' }}>
                    Профиль пуст — нажмите «Изменить», чтобы заполнить
                  </p>
                )}

                {/* ── Verification ─────────────────────────────────────────── */}
                {verStatus !== 'verified' && (
                  <>
                    <div style={{ height: 1, background: 'rgb(var(--primary-rgb) / 0.08)', margin: '18px 0' }} />
                    <VerificationBlock status={verStatus} />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ Logout ══════════════════════════════════════════════════════════ */}
        <PressableButton
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold"
          style={{
            background:    'rgb(var(--danger-rgb) / 5%)',
            border:        '1px solid rgb(var(--danger-rgb) / 12%)',
            color:         'var(--danger)',
          }}
        >
          <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
          {loggingOut ? 'Выходим...' : 'Выйти из аккаунта'}
        </PressableButton>

        <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 11, margin: 0, opacity: 0.6 }}>
          Вязубер v1.0
        </p>
      </div>

      {/* ══ Lightbox ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр фото"
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(15,8,4,0.88)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxSrc(null)}
          >
            <PressableButton
              aria-label="Закрыть"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}
              onClick={() => setLightboxSrc(null)}
            >
              <X size={18} aria-hidden="true" />
            </PressableButton>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              src={lightboxSrc}
              alt="Просмотр фото"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 16,
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
