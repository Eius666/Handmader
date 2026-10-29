'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, FileText, ShieldCheck, WalletCards } from 'lucide-react';

import { PageLayout } from '@/components/layout/PageLayout';
import { PressableButton } from '@/components/motion/Pressable';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import {
  authorizeMaterialAdvance,
  getMaterialAdvance,
  getOrder,
  requestMaterialAdvance,
  submitMaterialExpenseEvidence,
  type MaterialAdvanceDto,
} from '@/lib/firestore';
import type { Order } from '@/types';

export default function MaterialsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [advance, setAdvance] = useState<MaterialAdvanceDto | null>(null);
  const [amount, setAmount] = useState('');
  const [spentAmount, setSpentAmount] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([getOrder(id), getMaterialAdvance(id)])
      .then(([loadedOrder, loadedAdvance]) => {
        setOrder(loadedOrder);
        setAdvance(loadedAdvance);
        if (loadedAdvance) {
          setAmount(String(loadedAdvance.requestedAmountMinor / 100));
          setSpentAmount(String(loadedAdvance.requestedAmountMinor / 100));
        }
      })
      .catch((error) => setToast(error instanceof Error ? error.message : 'Не удалось загрузить аванс'))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (loading) {
    return <div className="flex h-full items-center justify-center"><span className="size-9 animate-spin rounded-full border-2 border-secondary border-t-primary" /></div>;
  }
  if (!order || !user) {
    return <PageLayout title="Материалы" showBack><p className="p-5 text-muted-foreground">Заказ не найден</p></PageLayout>;
  }

  const isCustomer = order.customerId === user.uid;
  const isMaster = order.selectedMasterId === user.uid;
  const maximumRubles = Math.floor((order.finalPrice ?? 0) / 2);

  async function handleRequest() {
    const amountMinor = rublesToMinor(amount);
    if (amountMinor === null) {
      setToast('Укажите целую сумму больше нуля');
      return;
    }
    setSaving(true);
    try {
      const result = await requestMaterialAdvance(id, amountMinor);
      setAdvance(result);
      setSpentAmount(String(result.requestedAmountMinor / 100));
      setToast('Запрос отправлен заказчику');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось запросить аванс');
    } finally {
      setSaving(false);
    }
  }

  async function handleAuthorize() {
    setSaving(true);
    try {
      setAdvance(await authorizeMaterialAdvance(id));
      setToast('Тестовый аванс разрешён; реальные деньги не переводились');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось подтвердить аванс');
    } finally {
      setSaving(false);
    }
  }

  async function handleEvidence() {
    const spentAmountMinor = rublesToMinor(spentAmount, true);
    if (spentAmountMinor === null) {
      setToast('Укажите корректную сумму расходов');
      return;
    }
    setSaving(true);
    try {
      setAdvance(await submitMaterialExpenseEvidence(id, spentAmountMinor, evidenceNote));
      setToast('Расходы и остаток сохранены в истории заказа');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось сохранить подтверждение');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageLayout title="Материалы" showBack>
      <div className="flex flex-col gap-5 px-5 pb-10 pt-4">
        <section className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/7 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-bold text-foreground">Только тестовый контур</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Здесь фиксируется разрешение использовать часть зарезервированной суммы на материалы. Реальные деньги мастеру не переводятся.
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-muted-foreground">Итоговая цена</span>
            <strong className="font-display text-lg text-primary">{(order.finalPrice ?? 0).toLocaleString('ru-RU')} ₽</strong>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3">
            <span className="text-sm font-semibold text-muted-foreground">Максимальный аванс, 50%</span>
            <strong>{maximumRubles.toLocaleString('ru-RU')} ₽</strong>
          </div>
        </section>

        {!advance && isMaster && (
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <div className="flex items-start gap-3">
              <WalletCards className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <div>
                <h2 className="font-bold text-foreground">Запросить аванс</h2>
                <p className="mt-1 text-sm text-muted-foreground">Укажите одну сумму только для покупки материалов. Подробная предварительная смета не обязательна.</p>
              </div>
            </div>
            <label className="flex flex-col gap-2 text-sm font-bold">
              Сумма, ₽
              <input className="input-field" type="number" min={1} max={maximumRubles} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} />
            </label>
            <PressableButton className="btn-primary" disabled={saving} onClick={() => void handleRequest()}>
              {saving ? 'Отправляем…' : 'Отправить заказчику'}
            </PressableButton>
          </section>
        )}

        {!advance && isCustomer && (
          <EmptyState text="Мастер пока не запросил аванс на материалы" />
        )}

        {advance?.status === 'requested' && (
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <h2 className="font-display text-xl font-bold">Запрошено {formatMoney(advance.requestedAmountMinor)}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isCustomer
                ? 'Подтвердите сумму, если согласны использовать её на материалы.'
                : 'Ожидаем явного подтверждения заказчика.'}
            </p>
            {isCustomer && (
              <PressableButton className="btn-primary" disabled={saving} onClick={() => void handleAuthorize()}>
                {saving ? 'Подтверждаем…' : 'Подтвердить тестовый аванс'}
              </PressableButton>
            )}
          </section>
        )}

        {advance?.status === 'authorized' && (
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-status-progress" aria-hidden="true" />
              <div>
                <h2 className="font-bold text-foreground">Разрешено {formatMoney(advance.requestedAmountMinor)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Операция записана в тестовый ledger без реального перевода.</p>
              </div>
            </div>
            {isMaster ? (
              <>
                <label className="flex flex-col gap-2 text-sm font-bold">
                  Фактически потрачено, ₽
                  <input className="input-field" type="number" min={0} max={advance.requestedAmountMinor / 100} step={1} value={spentAmount} onChange={(event) => setSpentAmount(event.target.value)} />
                </label>
                <label className="flex flex-col gap-2 text-sm font-bold">
                  Подтверждение расходов
                  <textarea className="input-field min-h-28 font-normal" maxLength={2_000} value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Магазин, дата, номер чека или другое относящееся к покупке подтверждение" />
                </label>
                <p className="text-xs leading-relaxed text-muted-foreground">Загрузка фото чека будет подключена вместе с защищённым объектным хранилищем. Сейчас сохраняются реквизиты и описание подтверждения.</p>
                <PressableButton className="btn-primary" disabled={saving || evidenceNote.trim().length < 10} onClick={() => void handleEvidence()}>
                  {saving ? 'Сохраняем…' : 'Зафиксировать расходы'}
                </PressableButton>
              </>
            ) : <p className="text-sm font-semibold text-muted-foreground">Ожидаем подтверждение покупки материалов от мастера.</p>}
          </section>
        )}

        {advance?.status === 'evidence_submitted' && advance.evidence && (
          <section className="flex flex-col gap-4 rounded-2xl bg-status-progress/10 p-5">
            <div className="flex gap-3">
              <FileText className="mt-0.5 size-6 shrink-0 text-status-progress" aria-hidden="true" />
              <div>
                <h2 className="font-bold text-foreground">Расходы зафиксированы</h2>
                <p className="mt-1 text-sm text-muted-foreground">Данные сохранены для возможной отмены или спора.</p>
              </div>
            </div>
            <MoneyRow label="Подтверждённый аванс" amount={advance.requestedAmountMinor} />
            <MoneyRow label="Указанные расходы" amount={advance.evidence.spentAmountMinor} />
            <MoneyRow label="Неиспользованный остаток" amount={advance.evidence.unusedAmountMinor} />
            <div className="rounded-xl bg-card/80 p-4 text-sm leading-relaxed text-foreground">{advance.evidence.note}</div>
          </section>
        )}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  );
}

function rublesToMinor(value: string, allowZero = false): number | null {
  const rubles = Number(value);
  if (!Number.isSafeInteger(rubles) || rubles < (allowZero ? 0 : 1)) return null;
  const minor = rubles * 100;
  return Number.isSafeInteger(minor) ? minor : null;
}

function formatMoney(amountMinor: number): string {
  return `${(amountMinor / 100).toLocaleString('ru-RU')} ₽`;
}

function EmptyState({ text }: { text: string }) {
  return <section className="rounded-2xl bg-card p-5 text-center text-sm font-semibold text-muted-foreground">{text}</section>;
}

function MoneyRow({ label, amount }: { label: string; amount: number }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><strong>{formatMoney(amount)}</strong></div>;
}
