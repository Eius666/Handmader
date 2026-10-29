'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Handshake, PackageCheck, Truck } from 'lucide-react';

import { PageLayout } from '@/components/layout/PageLayout';
import { PressableButton } from '@/components/motion/Pressable';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { acceptDeliveredOrder, confirmDeliveryReceipt, getAgreement, getDelivery, getOrder, startDelivery, type AgreementDto, type DeliveryDto } from '@/lib/firestore';
import type { Order } from '@/types';

export default function DeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [agreement, setAgreement] = useState<AgreementDto | null>(null);
  const [delivery, setDelivery] = useState<DeliveryDto | null>(null);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([getOrder(id), getAgreement(id), getDelivery(id)])
      .then(([loadedOrder, loadedAgreement, loadedDelivery]) => {
        setOrder(loadedOrder);
        setAgreement(loadedAgreement);
        setDelivery(loadedDelivery);
        setCarrier(loadedDelivery?.carrier ?? '');
        setTrackingNumber(loadedDelivery?.trackingNumber ?? '');
      })
      .catch((error) => setToast(error instanceof Error ? error.message : 'Не удалось загрузить передачу'))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (loading) return <div className="flex h-full items-center justify-center"><span className="size-9 animate-spin rounded-full border-2 border-secondary border-t-primary" /></div>;
  if (!order || !agreement || !user) return <PageLayout title="Получение" showBack><p className="p-5 text-muted-foreground">Заказ или условия не найдены</p></PageLayout>;

  const isCustomer = order.customerId === user.uid;
  const isMaster = order.selectedMasterId === user.uid;

  async function run(action: () => Promise<DeliveryDto>, success: string, nextStatus?: Order['status']) {
    setSaving(true);
    try {
      setDelivery(await action());
      if (nextStatus) setOrder((previous) => previous ? { ...previous, status: nextStatus } : previous);
      setToast(success);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось выполнить действие');
    } finally { setSaving(false); }
  }

  return (
    <PageLayout title={agreement.deliveryMethod === 'delivery' ? 'Доставка' : 'Личная встреча'} showBack>
      <div className="flex flex-col gap-5 px-5 pb-10 pt-4">
        <section className="rounded-2xl bg-primary/7 p-4 text-sm leading-relaxed text-foreground">
          {agreement.deliveryMethod === 'delivery'
            ? 'Мастер указывает перевозчика и трек-номер. После фактического получения заказчик подтверждает вручение.'
            : 'При личной встрече мастер начинает передачу, а заказчик подтверждает получение — это двойное подтверждение сторон.'}
        </section>

        {!delivery && isMaster && order.status === 'ready' && (
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <div className="flex gap-3">
              {agreement.deliveryMethod === 'delivery' ? <Truck className="size-6 text-primary" /> : <Handshake className="size-6 text-primary" />}
              <div><h2 className="font-bold">Начать передачу</h2><p className="mt-1 text-sm text-muted-foreground">Действие будет сохранено в истории заказа.</p></div>
            </div>
            {agreement.deliveryMethod === 'delivery' && <>
              <label className="flex flex-col gap-2 text-sm font-bold">Перевозчик<input className="input-field" value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Например, Почта России" maxLength={100} /></label>
              <label className="flex flex-col gap-2 text-sm font-bold">Трек-номер<input className="input-field" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} maxLength={100} /></label>
            </>}
            <PressableButton className="btn-primary" disabled={saving || (agreement.deliveryMethod === 'delivery' && (carrier.trim().length < 2 || trackingNumber.trim().length < 3))} onClick={() => void run(() => startDelivery(id, { carrier, trackingNumber }), agreement.deliveryMethod === 'delivery' ? 'Доставка зафиксирована' : 'Передача при встрече начата', 'in_delivery')}>
              {saving ? 'Сохраняем…' : agreement.deliveryMethod === 'delivery' ? 'Передать в доставку' : 'Подтвердить передачу со стороны мастера'}
            </PressableButton>
          </section>
        )}

        {!delivery && isCustomer && <Info text="Ожидаем, когда мастер начнёт передачу готового изделия." />}

        {delivery && ['handoff_pending', 'in_transit'].includes(delivery.status) && (
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <div className="flex gap-3"><PackageCheck className="size-6 text-primary" /><div><h2 className="font-bold">Ожидается получение</h2><p className="mt-1 text-sm text-muted-foreground">{delivery.method === 'delivery' ? `${delivery.carrier}, ${delivery.trackingNumber}` : 'Мастер подтвердил передачу при личной встрече.'}</p></div></div>
            {isCustomer ? <PressableButton className="btn-primary" disabled={saving} onClick={() => void run(() => confirmDeliveryReceipt(id), 'Получение подтверждено; началось окно приёмки', 'delivered')}>{saving ? 'Подтверждаем…' : 'Подтвердить получение'}</PressableButton> : <p className="text-sm font-semibold text-muted-foreground">Ожидаем подтверждение заказчика.</p>}
          </section>
        )}

        {delivery?.status === 'delivered' && (
          <section className="flex flex-col gap-4 rounded-2xl bg-status-progress/10 p-5">
            <div className="flex gap-3"><CheckCircle2 className="size-6 text-status-progress" /><div><h2 className="font-bold">Изделие получено</h2><p className="mt-1 text-sm text-muted-foreground">Если спор не открыт, заказ будет автоматически принят {delivery.acceptanceDueAt ? formatDate(delivery.acceptanceDueAt) : 'через 5 дней'}.</p></div></div>
            {isCustomer ? <><PressableButton className="btn-primary" disabled={saving} onClick={() => void run(() => acceptDeliveredOrder(id), 'Изделие принято', 'accepted')}>{saving ? 'Принимаем…' : 'Принять изделие'}</PressableButton><button type="button" onClick={() => router.push(`/orders/${id}/dispute`)} className="rounded-xl border border-status-danger/30 py-3 font-bold text-status-danger">Открыть спор</button></> : <p className="text-sm font-semibold text-muted-foreground">Ожидаем приёмку заказчика или окончание пятидневного срока.</p>}
          </section>
        )}

        {delivery?.status === 'accepted' && <section className="flex flex-col items-center gap-3 rounded-2xl bg-status-progress/10 p-6 text-center"><CheckCircle2 className="size-10 text-status-progress" /><h2 className="font-display text-xl font-bold">Заказ принят</h2><p className="text-sm text-muted-foreground">{delivery.acceptedAutomatically ? 'Приёмка выполнена автоматически после пяти дней без спора.' : 'Заказчик подтвердил соответствие изделия.'} Следующий этап — тестовая выплата.</p></section>}
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  );
}

function Info({ text }: { text: string }) { return <section className="rounded-2xl bg-card p-5 text-center text-sm font-semibold text-muted-foreground">{text}</section>; }
function formatDate(value: string) { return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)); }
