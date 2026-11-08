'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, LockKeyhole } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { PressableButton } from '@/components/motion/Pressable';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { confirmAmendment, getAgreement, getAmendment, getOrder, proposeAmendment, type AmendmentDto } from '@/lib/firestore';
import type { Order } from '@/types';

export default function AmendmentPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [amendment, setAmendment] = useState<AmendmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [description, setDescription] = useState('');
  const [measurements, setMeasurements] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tolerances, setTolerances] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([getOrder(id), getAgreement(id), getAmendment(id)]).then(([loadedOrder, agreement, loadedAmendment]) => {
      setOrder(loadedOrder); setAmendment(loadedAmendment);
      setDescription(loadedAmendment?.description ?? agreement?.description ?? loadedOrder?.description ?? '');
      setMeasurements(loadedAmendment?.measurements ?? agreement?.measurements ?? loadedOrder?.measurements ?? '');
      setDeadline(loadedAmendment?.deadline ?? agreement?.deadline ?? loadedOrder?.deadline ?? '');
      setTolerances(loadedAmendment?.tolerances ?? agreement?.tolerances ?? '');
      setReason(loadedAmendment?.status === 'pending' ? loadedAmendment.reason : '');
    }).catch((error) => setToast(error instanceof Error ? error.message : 'Не удалось загрузить изменение')).finally(() => setLoading(false));
  }, [id, user]);

  if (loading) return <div className="flex h-full items-center justify-center"><span className="size-9 animate-spin rounded-full border-2 border-secondary border-t-primary" /></div>;
  if (!order || !user) return <PageLayout title="Изменение заказа" showBack><p className="p-5 text-muted-foreground">Заказ не найден</p></PageLayout>;
  const isCustomer = order.customerId === user.uid;
  const ownConfirmed = isCustomer ? amendment?.confirmations.customer : amendment?.confirmations.master;
  const canChange = order.paymentStatus === 'funded' && ['paid', 'in_progress'].includes(order.status);

  async function propose() {
    setSaving(true);
    try {
      const result = await proposeAmendment(id, { description, measurements, deadline, tolerances: tolerances.trim() || undefined, reason });
      setAmendment(result); setToast('Изменение сохранено и отправлено второй стороне');
    } catch (error) { setToast(error instanceof Error ? error.message : 'Не удалось предложить изменение'); }
    finally { setSaving(false); }
  }
  async function confirm() {
    setSaving(true);
    try {
      const result = await confirmAmendment(id); setAmendment(result);
      setToast(result.status === 'confirmed' ? 'Изменение вступило в силу' : 'Ваше подтверждение сохранено');
    } catch (error) { setToast(error instanceof Error ? error.message : 'Не удалось подтвердить изменение'); }
    finally { setSaving(false); }
  }

  return <PageLayout title="Изменение заказа" showBack><main className="flex flex-col gap-4 px-5 py-5">
    <section className="rounded-2xl bg-primary/7 p-4 text-sm leading-relaxed">После тестовой оплаты любая новая версия мерок, описания или срока вступает в силу только после подтверждения заказчиком и мастером.</section>
    <section className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-sm"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" /><div><b>Цена зафиксирована: {(order.finalPrice ?? amendment?.finalPrice ?? 0).toLocaleString('ru-RU')} ₽</b><p className="mt-1 text-muted-foreground">Изменение цены будет отдельным финансовым сценарием с тестовой доплатой или возвратом.</p></div></section>
    <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
      <Field label="Описание"><textarea className="input-field min-h-28" value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canChange || saving} /></Field>
      <Field label="Мерки"><textarea className="input-field min-h-28" value={measurements} onChange={(event) => setMeasurements(event.target.value)} disabled={!canChange || saving} /></Field>
      <Field label="Новый срок"><input className="input-field" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} disabled={!canChange || saving} /></Field>
      <Field label="Допустимые отклонения"><textarea className="input-field min-h-20" value={tolerances} onChange={(event) => setTolerances(event.target.value)} disabled={!canChange || saving} /></Field>
      <Field label="Причина изменения"><textarea className="input-field min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Что изменилось и почему" disabled={!canChange || saving} /></Field>
      {canChange && <PressableButton className="btn-outline" disabled={saving || reason.trim().length < 10 || !deadline} onClick={() => void propose()}>{saving ? 'Сохраняем…' : amendment?.status === 'pending' ? 'Предложить новую версию' : 'Предложить изменение'}</PressableButton>}
    </section>
    {amendment && <section className="flex flex-col gap-3 rounded-2xl bg-card p-5"><h2 className="font-display text-lg font-bold">Изменение №{amendment.version}</h2><p className="text-sm text-muted-foreground">Будущая версия условий №{amendment.targetAgreementVersion}</p><Confirmation label="Заказчик" value={amendment.confirmations.customer} /><Confirmation label="Мастер" value={amendment.confirmations.master} />{amendment.status === 'pending' && !ownConfirmed && <PressableButton className="btn-primary" disabled={saving} onClick={() => void confirm()}>{saving ? 'Подтверждаем…' : 'Подтвердить изменение'}</PressableButton>}{amendment.status === 'confirmed' && <PressableButton className="btn-outline" onClick={() => router.replace(`/track/${id}`)}>Вернуться к заказу</PressableButton>}</section>}
    {!canChange && amendment?.status !== 'confirmed' && <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">Изменения доступны после оплаты и до готовности изделия.</p>}
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
  </main></PageLayout>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="flex flex-col gap-2 text-sm font-bold">{label}{children}</label>; }
function Confirmation({ label, value }: { label: string; value: boolean }) { return <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm font-semibold"><span>{label}</span><span className={value ? 'text-status-progress' : 'text-muted-foreground'}>{value ? <><Check className="mr-1 inline size-4" />Подтверждено</> : 'Ожидается'}</span></div>; }
