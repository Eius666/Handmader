'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';

interface RoleOption {
  role: UserRole;
  emoji: string;
  title: string;
  desc: string;
}

const ROLES: RoleOption[] = [
  {
    role: 'customer',
    emoji: '🛍️',
    title: 'Заказчик',
    desc: 'Создаю заказы на вязаные изделия, выбираю мастера и получаю готовые вещи',
  },
  {
    role: 'master',
    emoji: '🧶',
    title: 'Мастер',
    desc: 'Вяжу изделия на заказ, беру заказы из ленты и зарабатываю на любимом деле',
  },
  {
    role: 'both',
    emoji: '✨',
    title: 'Заказчик и мастер',
    desc: 'Могу и создавать заказы, и откликаться на заказы других',
  },
];

export default function SelectRolePage() {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const { setRole } = useAuth();
  const router = useRouter();

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    await setRole(selected);
    if (selected === 'master') {
      router.replace('/feed');
    } else {
      router.replace('/home');
    }
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        padding: '48px 20px 32px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '12px 0 6px' }}>
          Вы готовы!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0 }}>
          Выберите, как хотите использовать Handmader
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {ROLES.map((r) => (
          <button
            key={r.role}
            onClick={() => setSelected(r.role)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 14,
              padding: 18,
              borderRadius: 16,
              border: selected === r.role ? '2px solid var(--accent)' : '2px solid transparent',
              background: selected === r.role ? '#FFF0EB' : '#FFFFFF',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              boxShadow: '0 2px 12px rgba(45,45,45,0.06)',
            }}
          >
            <span style={{ fontSize: 32, flexShrink: 0 }}>{r.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', marginBottom: 4 }}>
                {r.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {r.desc}
              </div>
            </div>
            {selected === r.role && (
              <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 20, flexShrink: 0 }}>
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        className="btn-primary"
        onClick={handleContinue}
        disabled={!selected || loading}
        style={{ marginTop: 24 }}
      >
        {loading ? 'Сохраняем...' : 'Продолжить'}
      </button>
    </div>
  );
}
