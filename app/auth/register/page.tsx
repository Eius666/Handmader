'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getFirebaseErrorMessage } from '@/hooks/useAuth';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, name);
      // hasSelectedRole:false is set in signUp → root page shows OnboardingRole
      router.replace('/');
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      <div style={{ padding: '50px 24px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🧶</div>
        <h1
          style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', margin: '10px 0 4px' }}
        >
          Создать аккаунт
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
          Присоединяйтесь к Handmader
        </p>
      </div>

      <div
        style={{
          flex: 1,
          padding: '0 24px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div className="card" style={{ padding: 24 }}>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <input
              className="input-field"
              type="text"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
            <input
              className="input-field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              className="input-field"
              type="password"
              placeholder="Пароль (мин. 6 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <input
              className="input-field"
              type="password"
              placeholder="Повторите пароль"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <p style={{ color: '#E07A5F', fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          Уже есть аккаунт?{' '}
          <Link
            href="/auth/login"
            style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
