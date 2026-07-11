'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { StarRating } from '@/components/ui/StarRating';

const ROLE_LABELS: Record<string, string> = {
  customer: 'Заказчик',
  master: 'Мастер',
  both: 'Заказчик и мастер',
};

const ROLE_EMOJIS: Record<string, string> = {
  customer: '🛍️',
  master: '🧶',
  both: '✨',
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/auth/login');
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) return null;

  const mp = user.masterProfile;

  return (
    <PageLayout title="Профиль">
      <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Avatar + name */}
        <div
          className="card"
          style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #E07A5F, #F2A594)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
            }}
          >
            {user.displayName?.[0]?.toUpperCase() ?? '👤'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>
              {user.displayName}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
              {user.email}
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span>{ROLE_EMOJIS[user.role] ?? '👤'}</span>
            <span>{ROLE_LABELS[user.role] ?? user.role}</span>
          </div>
        </div>

        {/* Master profile */}
        {mp && (
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px' }}>
              🧶 Профиль мастера
            </h3>

            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                  {mp.completedOrders ?? 0}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>завершено</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>
                  {mp.rating?.toFixed(1) ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>рейтинг</div>
              </div>
            </div>

            {mp.rating > 0 && <StarRating value={Math.round(mp.rating)} size={18} />}

            {mp.bio && (
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 13,
                  color: 'var(--text)',
                  lineHeight: 1.45,
                }}
              >
                {mp.bio}
              </p>
            )}

            {mp.categories && mp.categories.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {mp.categories.map((cat) => (
                  <span
                    key={cat}
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 20,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="card" style={{ padding: 4, overflow: 'hidden' }}>
          <ActionItem
            emoji="🔄"
            label="Сменить роль"
            onClick={() => router.push('/auth/select-role')}
          />
          <div style={{ height: 1, background: 'var(--border)', margin: '0 16px' }} />
          <ActionItem
            emoji="ℹ️"
            label="О приложении"
            onClick={() => {}}
          />
        </div>

        <button
          className="btn-secondary"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{ marginTop: 4 }}
        >
          {loggingOut ? 'Выходим...' : '🚪 Выйти'}
        </button>

        <p
          style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 11,
            margin: 0,
          }}
        >
          Handmader v1.0 MVP
        </p>
      </div>
    </PageLayout>
  );
}

function ActionItem({
  emoji,
  label,
  onClick,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '15px 16px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 15,
        color: 'var(--text)',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
    </button>
  );
}
