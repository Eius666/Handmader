'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/hooks/useAuth';
import { RoleSelector } from './RoleSelector';
import { PressableButton } from '@/components/motion/Pressable';
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
        background: 'var(--background)',
        display: 'flex', flexDirection: 'column',
        padding: '0 20px', overflowY: 'auto',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        style={{ paddingTop: 64, textAlign: 'center', marginBottom: 36 }}
      >
        <div style={{ fontSize: 60, marginBottom: 14, lineHeight: 1 }}>🧶</div>
        <h1 className="font-display" style={{ fontSize: 27, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 10px' }}>
          Добро пожаловать!
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.5 }}>
          Выберите, как вы хотите использовать Вязубер
        </p>
      </motion.div>

      {/* Role cards */}
      <RoleSelector value={selected} onChange={setSelected} disabled={loading} />

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 10,
            background: 'rgb(var(--primary-rgb) / 8%)', border: '1px solid var(--primary)',
            fontSize: 13, color: 'var(--primary)', textAlign: 'center',
          }}
        >
          {error}
          <PressableButton
            onClick={() => setError('')}
            style={{ marginLeft: 8, fontWeight: 700, background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            ✕
          </PressableButton>
        </div>
      )}

      {/* CTA */}
      <PressableButton
        onClick={handleContinue}
        disabled={!selected || loading}
        className="btn-primary"
        style={{ marginTop: 24, marginBottom: 48 }}
      >
        {loading ? 'Сохраняем...' : 'Продолжить →'}
      </PressableButton>
    </div>
  );
}
