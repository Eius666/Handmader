'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useAuth, getFirebaseErrorMessage } from '@/hooks/useAuth';
import { PressableButton } from '@/components/motion/Pressable';

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
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        className="flex flex-col items-center px-5 pb-8 pt-16 text-center"
      >
        <span className="text-5xl leading-none">🧶</span>
        <h1 className="font-display mt-3 text-[32px] font-semibold text-primary">Вязубер</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Ваш мастер рядом</p>
      </motion.div>

      {/* Form area */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.32, 0.72, 0, 1] }}
        className="flex flex-1 flex-col gap-3 px-5 pb-10"
      >
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-[0_4px_16px_rgb(var(--foreground-rgb)_/_0.06)]">
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
            <PressableButton
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Входим...' : 'Войти'}
            </PressableButton>
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
      </motion.div>
    </div>
  );
}
