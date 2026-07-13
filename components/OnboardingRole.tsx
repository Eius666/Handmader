'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RoleSelector } from './RoleSelector';
import { UserRole } from '@/types';

export function OnboardingRole() {
  const { updateProfile } = useAuth();
  const [selected, setSelected] = useState<UserRole | undefined>(undefined);
  const [loading,  setLoading]   = useState(false);
  const [error,    setError]     = useState('');

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      await updateProfile({ role: selected, hasSelectedRole: true });
      // page.tsx useEffect detects hasSelectedRole: true and redirects by role
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить роль');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: '#FFF8F0',
        display: 'flex', flexDirection: 'column',
        padding: '0 20px', overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ paddingTop: 64, textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 60, marginBottom: 14, lineHeight: 1 }}>🧶</div>
        <h1 style={{ fontSize: 27, fontWeight: 800, color: '#2D2D2D', margin: '0 0 10px' }}>
          Добро пожаловать!
        </h1>
        <p style={{ fontSize: 15, color: '#8E7E74', margin: 0, lineHeight: 1.5 }}>
          Выберите, как вы хотите использовать Handmader
        </p>
      </div>

      {/* Role cards */}
      <RoleSelector value={selected} onChange={setSelected} disabled={loading} />

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 10,
            background: '#FFF0EB', border: '1px solid #E07A5F',
            fontSize: 13, color: '#E07A5F', textAlign: 'center',
          }}
        >
          {error}
          <button
            onClick={() => setError('')}
            style={{ marginLeft: 8, fontWeight: 700, background: 'none', border: 'none', color: '#E07A5F', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleContinue}
        disabled={!selected || loading}
        className="btn-primary"
        style={{ marginTop: 24, marginBottom: 48 }}
      >
        {loading ? 'Сохраняем...' : 'Продолжить →'}
      </button>
    </div>
  );
}
