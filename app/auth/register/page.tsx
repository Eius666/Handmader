'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getFirebaseErrorMessage } from '@/hooks/useAuth';

export default function RegisterPage() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
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
      router.replace('/');
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Logo */}
      <div className="flex flex-col items-center px-5 pb-6 pt-12 text-center">
        <span className="text-5xl leading-none">🧶</span>
        <h1 className="mt-3 text-[28px] font-extrabold text-primary">Создать аккаунт</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Присоединяйтесь к Handmader</p>
      </div>

      {/* Form area */}
      <div className="flex flex-1 flex-col gap-3 px-5 pb-10">
        <div className="rounded-2xl bg-card p-6 shadow-[0_4px_16px_rgba(45,45,45,0.06)]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              <p className="text-sm font-semibold text-primary">{error}</p>
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

        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{' '}
          <Link
            href="/auth/login"
            className="font-semibold text-primary"
            style={{ textDecoration: 'none' }}
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
