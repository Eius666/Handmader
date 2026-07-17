'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getFirebaseErrorMessage } from '@/hooks/useAuth';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background [&::-webkit-scrollbar]:hidden">
      {/* Logo */}
      <div className="flex flex-col items-center px-5 pb-8 pt-16 text-center">
        <span className="text-5xl leading-none">🧶</span>
        <h1 className="mt-3 text-[32px] font-extrabold text-primary">Handmader</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Ваш мастер рядом</p>
      </div>

      {/* Form area */}
      <div className="flex flex-1 flex-col gap-3 px-5 pb-10">
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-[0_4px_16px_rgba(45,45,45,0.06)]">
          <h2 className="text-xl font-bold text-foreground">Войти</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && (
              <p className="text-sm font-semibold text-primary">{error}</p>
            )}
            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Нет аккаунта?{' '}
          <Link
            href="/auth/register"
            className="font-semibold text-primary no-underline"
            style={{ textDecoration: 'none' }}
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
