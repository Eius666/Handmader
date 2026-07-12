'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { StarRating } from '@/components/ui/StarRating';
import { setUser } from '@/lib/firestore';
import { UserRole, OrderCategory, CATEGORY_LABELS, MasterProfile } from '@/types';

const ROLE_OPTIONS: { role: UserRole; emoji: string; title: string; desc: string }[] = [
  { role: 'customer', emoji: '🛍️', title: 'Заказчик',   desc: 'Создаю заказы на изделия' },
  { role: 'master',   emoji: '🧶', title: 'Мастер',     desc: 'Выполняю заказы на вязание' },
  { role: 'both',     emoji: '✨', title: 'Обе роли',   desc: 'И заказываю, и выполняю' },
];

const MASTER_CATS: OrderCategory[] = ['hat', 'sweater', 'scarf', 'toy', 'accessory', 'other'];

export default function ProfilePage() {
  const { user, setRole, refreshUser, logout } = useAuth();
  const router = useRouter();

  const [loggingOut,    setLoggingOut]    = useState(false);
  const [savingRole,    setSavingRole]    = useState(false);
  const [editingMaster, setEditingMaster] = useState(false);
  const [savingMaster,  setSavingMaster]  = useState(false);

  // Master profile form fields
  const [bio,  setBio]  = useState('');
  const [cats, setCats] = useState<OrderCategory[]>([]);
  const [urls, setUrls] = useState(['', '', '']);
  const [city, setCity] = useState('');

  // Initialise form from Firestore data once user is available
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

  async function handleRoleChange(newRole: UserRole) {
    if (!user || newRole === user.role || savingRole) return;
    setSavingRole(true);
    try {
      await setRole(newRole);
      const hasMasterRole = newRole === 'master' || newRole === 'both';
      setEditingMaster(hasMasterRole && !user.masterProfile);
    } finally {
      setSavingRole(false);
    }
  }

  async function handleSaveMaster() {
    if (!user) return;
    setSavingMaster(true);
    try {
      const masterProfile: MasterProfile = {
        bio,
        categories: cats,
        portfolioPhotos: urls.filter(Boolean),
        location: city,
        rating:          mp?.rating          ?? 0,
        completedOrders: mp?.completedOrders ?? 0,
      };
      await setUser(user.uid, { masterProfile });
      await refreshUser();
      setEditingMaster(false);
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
    <PageLayout title="Профиль">
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Avatar + name ──────────────────────────────────── */}
        <div
          className="card"
          style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          <div
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #E07A5F, #F2A594)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
            }}
          >
            {user.displayName?.[0]?.toUpperCase() ?? '👤'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
              {user.displayName}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{user.email}</p>
          </div>
        </div>

        {/* ── Role selection ─────────────────────────────────── */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              👤 Ваша роль
            </h3>
            {savingRole && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Сохранение...</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROLE_OPTIONS.map((r) => {
              const active = user.role === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => handleRoleChange(r.role)}
                  disabled={savingRole}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 12, width: '100%', textAlign: 'left',
                    border:      active ? '2px solid #E07A5F' : '2px solid var(--border)',
                    background:  active ? '#FFF0EB'           : 'var(--card)',
                    cursor:      savingRole ? 'default'        : 'pointer',
                    opacity:     savingRole && !active ? 0.6   : 1,
                    transition:  'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{r.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: active ? '#E07A5F' : 'var(--text)' }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.desc}</div>
                  </div>
                  {active && <span style={{ color: '#E07A5F', fontSize: 16, flexShrink: 0 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Master profile ─────────────────────────────────── */}
        {isMaster && (
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                🧶 Профиль мастера
              </h3>
              {mp && !editingMaster && (
                <button
                  onClick={() => setEditingMaster(true)}
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
                    placeholder="Расскажите об опыте, стиле и любимых техниках..."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1.5px solid var(--border)', background: 'var(--bg)',
                      fontSize: 14, color: 'var(--text)', resize: 'vertical',
                      fontFamily: 'inherit', lineHeight: 1.4, boxSizing: 'border-box',
                    }}
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
                          onClick={() =>
                            setCats((prev) => on ? prev.filter((c) => c !== cat) : [...prev, cat])
                          }
                          style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                            border:      on ? '1.5px solid #E07A5F' : '1.5px solid var(--border)',
                            background:  on ? '#FFF0EB'             : 'transparent',
                            color:       on ? '#E07A5F'             : 'var(--text-muted)',
                            fontWeight:  on ? 700                   : 400,
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

                <div style={{ display: 'flex', gap: 8 }}>
                  {mp && (
                    <button
                      onClick={() => setEditingMaster(false)}
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

        {/* ── Misc actions ───────────────────────────────────── */}
        <div className="card" style={{ padding: 4, overflow: 'hidden' }}>
          <ActionItem emoji="ℹ️" label="О приложении" onClick={() => {}} />
        </div>

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

function ActionItem({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%',
        padding: '15px 16px', background: 'none', border: 'none',
        cursor: 'pointer', fontSize: 15, color: 'var(--text)', textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
    </button>
  );
}
