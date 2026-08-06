'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getFirebaseErrorMessage } from '@/hooks/useAuth';
import { PASSWORD_CHECKS, validatePassword } from '@/lib/passwordValidation';

export default function RegisterPage() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const pwdResult  = validatePassword(password);
  const pwdTouched = password.length > 0;
  const canSubmit  = !loading && pwdResult.valid && password === confirm && name.trim() !== '' && email.trim() !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!pwdResult.valid) {
      setError(pwdResult.errors[0]);
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
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
      <div className="flex flex-col items-center px-5 pb-6 pt-12 text-center">
        <span className="text-5xl leading-none">🧶</span>
        <h1 className="mt-3 text-[28px] font-extrabold text-primary">Создать аккаунт</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Присоединяйтесь к Handmader</p>
      </div>

      {/* Form area */}
      <div className="flex flex-1 flex-col gap-3 px-5 pb-10">
        <div className="rounded-2xl bg-card p-6 shadow-[0_4px_16px_rgb(var(--foreground-rgb) / 0.06)]">
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
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            {/* Password requirements */}
            {pwdTouched && (
              <ul className="flex flex-col gap-1.5 px-1 pb-1">
                {PASSWORD_CHECKS.map(({ key, label, test }) => {
                  const ok = test(password);
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <span
                        className="flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black leading-none transition-all duration-200"
                        style={{
                          background: ok ? 'rgba(74,124,89,0.12)' : 'rgba(120,113,108,0.1)',
                          color:      ok ? '#4a7c59' : 'var(--muted-foreground)',
                        }}
                      >
                        {ok ? '✓' : '·'}
                      </span>
                      <span
                        className="text-[12px] font-medium transition-colors duration-200"
                        style={{ color: ok ? '#4a7c59' : 'var(--muted-foreground)' }}
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <input
              className="input-field"
              type="password"
              placeholder="Повторите пароль"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />

            {/* Confirm mismatch hint */}
            {confirm.length > 0 && password !== confirm && (
              <p className="px-1 text-[12px] font-medium" style={{ color: 'var(--danger)', marginTop: -4 }}>
                Пароли не совпадают
              </p>
            )}

            {error && (
              <p className="text-sm font-semibold text-primary">{error}</p>
            )}

            <button
              className="btn-primary"
              type="submit"
              disabled={!canSubmit}
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
