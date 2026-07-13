'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { StarRating } from '@/components/ui/StarRating';
import { setUser } from '@/lib/firestore';
import { OrderCategory, CATEGORY_LABELS, MasterProfile } from '@/types';

const MASTER_CATS: OrderCategory[] = ['hat', 'sweater', 'scarf', 'toy', 'accessory', 'other'];

export default function ProfilePage() {
  const { user, refreshUser, refreshProfile, logout } = useAuth();
  const router = useRouter();

  const [loggingOut,    setLoggingOut]    = useState(false);
  const [editingMaster, setEditingMaster] = useState(false);
  const [savingMaster,  setSavingMaster]  = useState(false);
  const [masterError,   setMasterError]   = useState('');

  // Master profile form state
  const [bio,  setBio]  = useState('');
  const [cats, setCats] = useState<OrderCategory[]>([]);
  const [urls, setUrls] = useState(['', '', '']);
  const [city, setCity] = useState('');

  // Always fetch fresh profile on mount so completedOrders/rating are up to date
  useEffect(() => {
    refreshProfile()
      .then(() => console.log('[Profile] refreshProfile done'))
      .catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Log every time user state changes (fires after refreshProfile resolves)
  useEffect(() => {
    if (!user) return;
    console.log('[Profile] user state updated — uid:', user.uid);
    console.log('[Profile] masterProfile.completedOrders:', user.masterProfile?.completedOrders);
    console.log('[Profile] full masterProfile:', JSON.stringify(user.masterProfile));
  }, [user]);

  // Initialise form from Firestore data once user loads
  useEffect(() => {
    if (!user) return;
    const mp = user.masterProfile;
    setBio(mp?.bio ?? '');
    setCats(mp?.categories ?? []);
    setUrls([
      mp?.portfolioPhotos?.[0] ?? '',
      mp?.portfolioPhotos?.[1] ?? '',
      mp?.portfolioPhotos?.[2] ?? '',
    ]);
    setCity(mp?.location ?? '');
    const hasMasterRole = user.role === 'master' || user.role === 'both';
    setEditingMaster(hasMasterRole && !mp);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const isMaster = user.role === 'master' || user.role === 'both';
  const mp = user.masterProfile;

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
          setTimeout(
            () => reject(new Error('Firestore не ответил за 5 секунд')),
            5000,
          )
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
    try {
      await logout();
      router.replace('/auth/login');
    } finally {
      setLoggingOut(false);
    }
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
          <Settings size={22} />
        </Link>
      }
    >
      <div className="flex flex-col gap-6 px-5 pb-24 pt-4">

        {/* ── Avatar + name ──────────────────────────────── */}
        <div
          className="flex flex-col items-center gap-3 p-6"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(180,100,70,0.08)',
            borderRadius: 22,
            boxShadow: '0 2px 12px rgba(140,80,50,0.06)',
          }}
        >
          <div
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #d96c52, #f0a07a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34,
              boxShadow: '0 6px 20px rgba(217,108,82,0.3)',
              border: '3px solid rgba(255,255,255,0.9)',
            }}
          >
            {user.displayName?.[0]?.toUpperCase() ?? '👤'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: 'var(--text)', letterSpacing: '-0.03em' }}>
              {user.displayName}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{user.email}</p>
          </div>
        </div>

        {/* ── Master profile ─────────────────────────────── */}
        {isMaster && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid rgba(180,100,70,0.08)',
              borderRadius: 20,
              padding: 16,
              boxShadow: '0 2px 10px rgba(140,80,50,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                🧶 Профиль мастера
              </h3>
              {mp && !editingMaster && (
                <button
                  onClick={() => { setEditingMaster(true); setMasterError(''); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0,
                  }}
                >
                  Редактировать
                </button>
              )}
            </div>

            {editingMaster ? (
              // ── Edit form ──────────────────────────────
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {!mp && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    Заполните профиль — заказчики увидят вас в откликах
                  </p>
                )}

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
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
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                    Категории
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {MASTER_CATS.map((cat) => {
                      const on = cats.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => setCats((prev) => on ? prev.filter((c) => c !== cat) : [...prev, cat])}
                          style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                            border:     on ? '1.5px solid #E07A5F' : '1.5px solid var(--border)',
                            background: on ? '#FFF0EB'             : 'transparent',
                            color:      on ? '#E07A5F'             : 'var(--text-muted)',
                            fontWeight: on ? 700                   : 400,
                            transition: 'all 0.12s',
                          }}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                    Портфолио (ссылки на фото)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {urls.map((url, i) => (
                      <input
                        key={i}
                        value={url}
                        onChange={(e) =>
                          setUrls((prev) => prev.map((u, j) => (j === i ? e.target.value : u)))
                        }
                        placeholder={`Ссылка ${i + 1} (https://...)`}
                        className="input-field"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
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
                  <p style={{ color: '#E07A5F', fontSize: 13, margin: 0, textAlign: 'center' }}>
                    {masterError}
                  </p>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  {mp && (
                    <button
                      onClick={() => { setEditingMaster(false); setMasterError(''); }}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Отмена
                    </button>
                  )}
                  <button
                    onClick={handleSaveMaster}
                    disabled={savingMaster}
                    className="btn-primary"
                    style={{ flex: 2 }}
                  >
                    {savingMaster ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            ) : mp ? (
              // ── View mode ──────────────────────────────
              <div>
                {mp.rating > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <StarRating value={Math.round(mp.rating)} size={18} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>
                      {mp.completedOrders ?? 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>завершено</div>
                  </div>
                  {mp.rating > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>
                        {mp.rating.toFixed(1)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>рейтинг</div>
                    </div>
                  )}
                </div>
                {mp.bio && (
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                    {mp.bio}
                  </p>
                )}
                {mp.location && (
                  <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-muted)' }}>
                    📍 {mp.location}
                  </p>
                )}
                {mp.categories && mp.categories.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {mp.categories.map((cat) => (
                      <span
                        key={cat}
                        style={{
                          background: 'var(--bg)', borderRadius: 20,
                          padding: '4px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text)',
                        }}
                      >
                        {CATEGORY_LABELS[cat]}
                      </span>
                    ))}
                  </div>
                )}
                {!mp.bio && !mp.location && (!mp.categories || mp.categories.length === 0) && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                    Профиль пуст — нажмите «Редактировать», чтобы заполнить
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* ── Logout ─────────────────────────────────────── */}
        <button className="btn-secondary" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Выходим...' : '🚪 Выйти'}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>
          Handmader v1.0 MVP
        </p>
      </div>
    </PageLayout>
  );
}
