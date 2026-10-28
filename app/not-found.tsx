import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12 text-center">
      <section className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-card p-7 shadow-[var(--shadow-card)]">
        <div className="text-5xl" aria-hidden="true">🧶</div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Страница не найдена</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Возможно, ссылка устарела или страница была перемещена.
        </p>
        <Link href="/home" className="btn-primary mt-2 w-full px-4 py-3 text-center">
          На главную
        </Link>
      </section>
    </main>
  );
}
