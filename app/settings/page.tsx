'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageLayout } from '@/components/layout/PageLayout';
import { RoleSelector } from '@/components/RoleSelector';
import { UserRole } from '@/types';

const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'Заказчик',
  master:   'Мастер',
  both:     'Заказчик и мастер',
};

export default function SettingsPage() {
  const { user, setRole } = useAuth();
  const [editingRole,  setEditingRole]  = useState(false);
  const [pendingRole,  setPendingRole]  = useState<UserRole | undefined>(user?.role);
  const [savingRole,   setSavingRole]   = useState(false);
  const [roleError,    setRoleError]    = useState('');

  if (!user) return null;

  async function handleSaveRole() {
    if (!user || !pendingRole || pendingRole === user.role) return;
    setSavingRole(true);
    setRoleError('');
    try {
      await setRole(pendingRole);
      setEditingRole(false);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Не удалось сохранить роль');
    } finally {
      setSavingRole(false);
    }
  }

  return (
    <PageLayout title="Настройки" showBack>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Role section ──────────────────────────────── */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                Роль аккаунта
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                {ROLE_LABELS[user.role]}
              </div>
            </div>
            {!editingRole && (
              <button
                onClick={() => { setEditingRole(true); setPendingRole(user.role); setRoleError(''); }}
                style={{
                  background: 'var(--bg)', border: 'none', borderRadius: 8,
                  padding: '7px 14px', fontSize: 13, fontWeight: 600,
                  color: 'var(--accent)', cursor: 'pointer',
                }}
              >
                Изменить
              </button>
            )}
          </div>

          {editingRole && (
            <div style={{ marginTop: 18 }}>
              <RoleSelector
                value={pendingRole}
                onChange={setPendingRole}
                disabled={savingRole}
              />
              {roleError && (
                <p style={{ color: '#E07A5F', fontSize: 13, margin: '10px 0 0', textAlign: 'center' }}>
                  {roleError}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => { setEditingRole(false); setRoleError(''); }}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveRole}
                  disabled={savingRole || !pendingRole || pendingRole === user.role}
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  {savingRole ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Stubs ─────────────────────────────────────── */}
        {[
          { emoji: '🔔', label: 'Уведомления',  sub: 'Скоро' },
          { emoji: '🌍', label: 'Язык',          sub: 'Русский' },
          { emoji: '🎨', label: 'Тема',           sub: 'Светлая' },
        ].map((item) => (
          <div
            key={item.label}
            className="card"
            style={{
              padding: '14px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
              opacity: 0.55, cursor: 'default',
            }}
          >
            <span style={{ fontSize: 22 }}>{item.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
