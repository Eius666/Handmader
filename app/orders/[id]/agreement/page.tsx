'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, ShieldCheck, WalletCards } from 'lucide-react';

import { PageLayout } from '@/components/layout/PageLayout';
import { PressableButton } from '@/components/motion/Pressable';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import {
  confirmAgreement,
  getAgreement,
  getOrder,
  proposeAgreement,
  simulateMockPayment,
  type AgreementDto,
} from '@/lib/firestore';
import type { Order } from '@/types';

export default function AgreementPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [agreement, setAgreement] = useState<AgreementDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'local' | 'delivery'>('local');
  const [deliveryIncluded, setDeliveryIncluded] = useState(false);
  const [tolerances, setTolerances] = useState('');

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([getOrder(id), getAgreement(id)])
      .then(([loadedOrder, loadedAgreement]) => {
        setOrder(loadedOrder);
        setAgreement(loadedAgreement);
        const price = loadedAgreement?.finalPrice ?? loadedOrder?.selectedPrice ?? loadedOrder?.budgetMax;
        setFinalPrice(price ? String(price) : '');
        setDeadline(loadedAgreement?.deadline ?? loadedOrder?.deadline ?? '');
        setDeliveryMethod(
          loadedAgreement?.deliveryMethod
          ?? (loadedOrder?.deliveryOption === 'delivery' ? 'delivery' : 'local'),
        );
        setDeliveryIncluded(loadedAgreement?.deliveryIncluded ?? false);
        setTolerances(loadedAgreement?.tolerances ?? '');
      })
      .catch((error) => setToast(error instanceof Error ? error.message : 'Не удалось загрузить условия'))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><span className="size-9 animate-spin rounded-full border-2 border-secondary border-t-primary" /></div>;
  }
  if (!order || !user) {
    return <PageLayout title="Условия" showBack><p className="p-5 text-muted-foreground">Заказ не найден</p></PageLayout>;
  }

  const isCustomer = order.customerId === user.uid;
  const ownConfirmed = isCustomer
    ? agreement?.confirmations.customer === true
    : agreement?.confirmations.master === true;
  const canEdit = order.status === 'master_selected';

  async function refresh() {
    const [updatedOrder, updatedAgreement] = await Promise.all([getOrder(id), getAgreement(id)]);
    setOrder(updatedOrder);
    setAgreement(updatedAgreement);
  }

  async function handlePropose() {
    const price = Number(finalPrice);
    if (!Number.isSafeInteger(price) || price < 100) {
      setToast('Укажите итоговую цену от 100 рублей');
      return;
    }
    setSaving(true);
    try {
      const result = await proposeAgreement(id, {
        finalPrice: price,
        deadline,
        deliveryMethod,
        deliveryIncluded,
        tolerances: tolerances.trim() || undefined,
      });
      setAgreement(result);
      setToast('Версия условий сохранена; обе стороны должны её подтвердить');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось сохранить условия');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    setSaving(true);
    try {
      const result = await confirmAgreement(id);
      setAgreement(result);
      await refresh();
      setToast(result.status === 'confirmed'
        ? 'Обе стороны подтвердили условия'
        : 'Ваше подтверждение сохранено');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось подтвердить условия');
    } finally {
      setSaving(false);
    }
  }

  async function handleMockPayment() {
    setSaving(true);
    try {
      await simulateMockPayment(id);
      await refresh();
      setToast('Тестовая оплата прошла; реальные деньги не списаны');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось провести тестовую оплату');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageLayout title="Итоговые условия" showBack>
      <div className="flex flex-col gap-5 px-5 pb-10 pt-4">
        <section className="rounded-2xl bg-primary/7 p-4 text-sm leading-relaxed text-foreground">
          Перед тестовой оплатой заказчик и мастер независимо подтверждают одну и ту же версию цены, срока, мерок и доставки.
        </section>

        <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
          <label className="flex flex-col gap-2 text-sm font-bold">
            Итоговая цена, ₽
            <input className="input-field" type="number" min={100} value={finalPrice} onChange={(event) => setFinalPrice(event.target.value)} disabled={!canEdit || saving} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold">
            Срок готовности
            <input className="input-field" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} disabled={!canEdit || saving} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold">
            Способ получения
            <select className="input-field" value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value as 'local' | 'delivery')} disabled={!canEdit || saving}>
              {order.deliveryOption !== 'delivery' && <option value="local">Личная встреча</option>}
              {order.deliveryOption !== 'local' && <option value="delivery">Доставка по России</option>}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={deliveryIncluded} onChange={(event) => setDeliveryIncluded(event.target.checked)} disabled={!canEdit || saving} />
            Доставка включена в итоговую цену
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold">
            Допустимые отклонения
            <textarea className="input-field min-h-24" value={tolerances} onChange={(event) => setTolerances(event.target.value)} placeholder="Например: длина ±2 см" disabled={!canEdit || saving} />
          </label>
          <div className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Снимок задания:</strong><br />
            {order.description}<br /><br />
            <strong className="text-foreground">Мерки:</strong><br />
            {order.measurements}
          </div>
          {canEdit && (
            <PressableButton onClick={handlePropose} disabled={saving || !deadline} className="btn-outline">
              {saving ? 'Сохраняем…' : agreement ? 'Создать новую версию' : 'Предложить условия'}
            </PressableButton>
          )}
        </section>

        {agreement && (
          <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <h2 className="font-display text-lg font-bold">Версия {agreement.version}</h2>
            <ConfirmationRow label="Заказчик" confirmed={agreement.confirmations.customer} />
            <ConfirmationRow label="Мастер" confirmed={agreement.confirmations.master} />
            {agreement.status === 'pending' && !ownConfirmed && (
              <PressableButton onClick={handleConfirm} disabled={saving} className="btn-primary">
                {saving ? 'Подтверждаем…' : 'Подтвердить версию'}
              </PressableButton>
            )}
          </section>
        )}

        {agreement?.status === 'confirmed' && order.status === 'awaiting_payment' && (
          <section className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-start gap-3">
              <WalletCards className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-bold">Тестовый платёж</h2>
                <p className="mt-1 text-sm text-muted-foreground">Реальные деньги не списываются. Контур проверяет резерв, комиссию 10% и идемпотентность.</p>
              </div>
            </div>
            {isCustomer ? (
              <PressableButton onClick={handleMockPayment} disabled={saving} className="btn-primary">
                {saving ? 'Проводим…' : `Оплатить тестово ${agreement.finalPrice.toLocaleString('ru-RU')} ₽`}
              </PressableButton>
            ) : <p className="text-sm font-semibold text-muted-foreground">Ожидаем тестовую оплату заказчика</p>}
          </section>
        )}

        {order.status === 'paid' && (
          <section className="flex flex-col items-center gap-3 rounded-2xl bg-status-progress/10 p-6 text-center">
            <ShieldCheck className="size-10 text-status-progress" />
            <h2 className="font-display text-xl font-bold">Тестовая оплата подтверждена</h2>
            <p className="text-sm text-muted-foreground">Средства зарезервированы только в тестовом ledger.</p>
            <PressableButton onClick={() => router.replace(`/track/${id}`)} className="btn-primary">К заказу</PressableButton>
          </section>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  );
}

function ConfirmationRow({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm font-semibold">
      <span>{label}</span>
      <span className={confirmed ? 'text-status-progress' : 'text-muted-foreground'}>
        {confirmed ? <><Check className="mr-1 inline size-4" />Подтверждено</> : 'Ожидается'}
      </span>
    </div>
  );
}
