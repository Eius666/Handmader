'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CircleDollarSign, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Spinner } from '@/components/ui/Spinner';
import { executeTestSettlement, getPendingSettlements, getStaffActor, type StaffActorDto, type StaffSettlementDto } from '@/lib/staff';

export default function StaffSettlementsPage() {
  const [staff, setStaff] = useState<StaffActorDto | null>(null);
  const [items, setItems] = useState<StaffSettlementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void Promise.all([getStaffActor(), getPendingSettlements()]).then(([actor, settlements]) => { setStaff(actor); setItems(settlements); }).catch((value) => setError(value instanceof Error ? value.message : 'Не удалось загрузить расчёты')).finally(() => setLoading(false)); }, []);

  async function execute(item: StaffSettlementDto) {
    setBusy(item.orderId); setError('');
    try { await executeTestSettlement(item.orderId); setItems((current) => current.filter((candidate) => candidate.orderId !== item.orderId)); }
    catch (value) { setError(value instanceof Error ? value.message : 'Не удалось выполнить тестовый расчёт'); }
    finally { setBusy(''); }
  }

  return <PageLayout title="Расчёты" showBack hideNav><main className="flex flex-col gap-4 px-5 py-5">
    <div className="flex flex-wrap gap-4 text-sm font-bold text-primary"><Link href="/staff/disputes">Споры</Link><Link href="/staff/verifications">Верификации</Link><Link href="/staff/reselections">Смена мастера</Link></div>
    <section className="flex gap-3 rounded-2xl border border-status-warning/30 bg-status-warning/10 p-4 text-sm"><ShieldAlert className="mt-0.5 size-5 shrink-0 text-status-warning" /><div><b>Только тестовый контур</b><p className="mt-1 text-muted-foreground">Кнопка фиксирует сценарий выплаты или возврата в базе. Реальные деньги не списываются и не переводятся.</p></div></section>
    {loading && <div className="flex justify-center py-16"><Spinner size={36} /></div>}
    {error && <section className="rounded-xl bg-status-danger/10 p-4 font-semibold text-status-danger">{error}</section>}
    {!loading && items.length === 0 && <section className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center"><ShieldCheck className="size-10 text-primary" /><p className="font-bold">Расчётов, готовых к выполнению, нет</p></section>}
    {items.map((item) => <article key={item.orderId} className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
      <div className="flex gap-3"><CircleDollarSign className="size-6 text-primary" /><div><h2 className="font-display text-lg font-semibold">Заказ №{item.orderId.slice(0, 8)}</h2><p className="text-sm text-muted-foreground">{item.orderTitle}</p></div></div>
      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-secondary p-3 text-sm"><div><dt className="text-xs text-muted-foreground">Заказчик</dt><dd className="font-semibold">{item.customerAlias}</dd></div><div><dt className="text-xs text-muted-foreground">Мастер</dt><dd className="font-semibold">{item.masterAlias}</dd></div></dl>
      <dl className="grid grid-cols-2 gap-3 text-sm"><Amount label="Сумма" value={item.grossAmountMinor} /><Amount label="Возврат" value={item.customerRefundAmountMinor} /><Amount label="Мастеру" value={item.masterPayoutAmountMinor} /><Amount label="Комиссия" value={item.platformFeeAmountMinor} /></dl>
      <p className="rounded-xl bg-secondary p-3 text-sm">Результат: <b>{outcomeLabel(item.outcome)}</b></p>
      {staff?.role === 'admin' ? <button type="button" disabled={busy === item.orderId} onClick={() => void execute(item)} className="rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{busy === item.orderId ? 'Выполняем…' : 'Выполнить тестовый расчёт'}</button> : <p className="text-sm text-muted-foreground">Просмотр доступен поддержке, выполнение — только администратору.</p>}
    </article>)}
  </main></PageLayout>;
}

function Amount({ label, value }: { label: string; value: number }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-semibold">{rubles(value)} ₽</dd></div>; }
function rubles(minor: number) { return (minor / 100).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function outcomeLabel(value: StaffSettlementDto['outcome']) { return value === 'completed' ? 'заказ завершится' : value === 'refunded' ? 'полный возврат' : 'частичный возврат'; }
