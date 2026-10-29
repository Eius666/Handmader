'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExternalLink, Scale, ShieldCheck } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Spinner } from '@/components/ui/Spinner';
import { getOpenDisputes, getStaffActor, resolveDispute, type StaffActorDto, type StaffDisputeDto } from '@/lib/staff';

type Resolution = 'accept_order' | 'full_refund' | 'partial_refund';
interface Form { resolution: Resolution; summary: string; refund: string; master: string; fee: string }

export default function StaffDisputesPage() {
  const [staff, setStaff] = useState<StaffActorDto | null>(null);
  const [items, setItems] = useState<StaffDisputeDto[]>([]);
  const [forms, setForms] = useState<Record<string, Form>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void Promise.all([getStaffActor(), getOpenDisputes()]).then(([actor, disputes]) => { setStaff(actor); setItems(disputes); setForms(Object.fromEntries(disputes.map((item) => [item.id, defaultForm(item)]))); }).catch((value) => setError(value instanceof Error ? value.message : 'Не удалось загрузить споры')).finally(() => setLoading(false)); }, []);

  function update(id: string, patch: Partial<Form>) { setForms((current) => ({ ...current, [id]: { ...current[id], ...patch } })); }
  function choose(item: StaffDisputeDto, resolution: Resolution) {
    if (resolution === 'accept_order') update(item.id, { resolution, refund: '0', master: rubles(item.suggestedMasterAmountMinor), fee: rubles(item.suggestedPlatformFeeAmountMinor) });
    else if (resolution === 'full_refund') update(item.id, { resolution, refund: rubles(item.grossAmountMinor), master: '0', fee: '0' });
    else update(item.id, { resolution });
  }
  async function submit(item: StaffDisputeDto) {
    const form = forms[item.id]; setBusy(item.id); setError('');
    try {
      await resolveDispute(item.id, { resolution: form.resolution, decisionSummary: form.summary, customerRefundAmountMinor: minor(form.refund), masterPayoutAmountMinor: minor(form.master), platformFeeAmountMinor: minor(form.fee) });
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch (value) { setError(value instanceof Error ? value.message : 'Не удалось сохранить решение'); }
    finally { setBusy(''); }
  }

  return <PageLayout title="Споры" showBack hideNav><main className="flex flex-col gap-4 px-5 py-5">
    <div className="flex gap-4 text-sm font-bold text-primary"><Link href="/staff/verifications">Верификации</Link><Link href="/staff/reselections">Смена мастера</Link></div>
    {loading && <div className="flex justify-center py-16"><Spinner size={36} /></div>}
    {error && <section className="rounded-xl bg-status-danger/10 p-4 font-semibold text-status-danger">{error}</section>}
    {!loading && items.length === 0 && <section className="flex flex-col items-center gap-3 rounded-2xl bg-card p-8 text-center"><ShieldCheck className="size-10 text-primary" /><p className="font-bold">Открытых споров нет</p></section>}
    {items.map((item) => { const form = forms[item.id] ?? defaultForm(item); const total = minor(form.refund) + minor(form.master) + minor(form.fee); return <article key={item.id} className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
      <div className="flex gap-3"><Scale className="size-6 text-primary" /><div><h2 className="font-display text-lg font-semibold">Заказ №{item.orderId.slice(0, 8)}</h2><p className="text-sm text-muted-foreground">{item.orderTitle}</p></div></div>
      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-secondary p-3 text-sm"><div><dt className="text-xs text-muted-foreground">Заказчик</dt><dd className="font-semibold">{item.customerAlias}</dd></div><div><dt className="text-xs text-muted-foreground">Мастер</dt><dd className="font-semibold">{item.masterAlias}</dd></div></dl>
      <div><p className="text-xs font-bold uppercase text-muted-foreground">Причина</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.reason}</p></div>
      <div className="flex flex-col gap-2"><p className="text-xs font-bold uppercase text-muted-foreground">Доказательства</p>{item.evidence.map((evidence) => <div key={evidence.id} className="rounded-xl bg-secondary p-3 text-sm"><b>{evidence.authorAlias}</b><p className="mt-1 whitespace-pre-wrap">{evidence.description}</p>{evidence.sourceUrl && <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-primary">Ссылка <ExternalLink className="size-3" /></a>}</div>)}</div>
      {staff?.role === 'admin' ? <div className="flex flex-col gap-3 border-t border-border pt-4"><label className="text-sm font-bold">Итог<select className="input-field mt-2" value={form.resolution} onChange={(event) => choose(item, event.target.value as Resolution)}><option value="accept_order">Принять заказ</option><option value="full_refund">Полный возврат</option><option value="partial_refund">Частичный возврат</option></select></label>
        <textarea className="input-field min-h-24" value={form.summary} onChange={(event) => update(item.id, { summary: event.target.value })} placeholder="Основание решения и учтённые доказательства" maxLength={4000} />
        <div className="grid grid-cols-3 gap-2">{([['refund', 'Заказчику'], ['master', 'Мастеру'], ['fee', 'Платформе']] as const).map(([key, label]) => <label key={key} className="text-xs font-bold">{label}<input type="number" min="0" step="0.01" className="input-field mt-1 px-2" value={form[key]} onChange={(event) => update(item.id, { [key]: event.target.value })} /></label>)}</div>
        <p className={`text-xs font-semibold ${total === item.grossAmountMinor ? 'text-status-progress' : 'text-status-danger'}`}>Распределено {rubles(total)} из {rubles(item.grossAmountMinor)} ₽</p>
        <button type="button" disabled={busy === item.id || form.summary.trim().length < 10 || total !== item.grossAmountMinor} onClick={() => void submit(item)} className="rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{busy === item.id ? 'Сохраняем…' : 'Зафиксировать решение'}</button>
      </div> : <p className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">Поддержка изучает материалы; денежное решение фиксирует администратор.</p>}
    </article>; })}
  </main></PageLayout>;
}

function defaultForm(item: StaffDisputeDto): Form { return { resolution: 'accept_order', summary: '', refund: '0', master: rubles(item.suggestedMasterAmountMinor), fee: rubles(item.suggestedPlatformFeeAmountMinor) }; }
function rubles(minorValue: number) { return (minorValue / 100).toFixed(2).replace('.00', ''); }
function minor(value: string) { const parsed = Number(value.replace(',', '.')); return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0; }
