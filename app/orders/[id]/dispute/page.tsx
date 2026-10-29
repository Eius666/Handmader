'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ExternalLink, FilePlus2, Scale, ShieldAlert } from 'lucide-react';

import { PageLayout } from '@/components/layout/PageLayout';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import { addDisputeEvidence, getDispute, openDispute, type DisputeDto } from '@/lib/firestore';

export default function DisputePage() {
  const { id } = useParams<{ id: string }>();
  const [dispute, setDispute] = useState<DisputeDto | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!id) return;
    void getDispute(id).then(setDispute).catch((error) => setToast(error instanceof Error ? error.message : 'Не удалось загрузить спор')).finally(() => setLoading(false));
  }, [id]);

  async function handleOpen() {
    setSaving(true);
    try { setDispute(await openDispute(id, reason)); setReason(''); setToast('Спор открыт'); }
    catch (error) { setToast(error instanceof Error ? error.message : 'Не удалось открыть спор'); }
    finally { setSaving(false); }
  }
  async function handleEvidence() {
    setSaving(true);
    try { setDispute(await addDisputeEvidence(id, description, sourceUrl || undefined)); setDescription(''); setSourceUrl(''); setToast('Доказательство добавлено'); }
    catch (error) { setToast(error instanceof Error ? error.message : 'Не удалось добавить доказательство'); }
    finally { setSaving(false); }
  }

  return (
    <PageLayout title="Спор по заказу" showBack>
      <main className="flex flex-col gap-4 px-5 py-5">
        {loading && <div className="flex justify-center py-16"><Spinner size={36} /></div>}
        {!loading && !dispute && (
          <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
            <div className="flex gap-3"><ShieldAlert className="size-6 shrink-0 text-status-danger" /><div><h2 className="font-bold">Обращение в администрацию</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Опишите факты. Чат, условия, доставка и материалы останутся в истории.</p></div></div>
            <textarea className="input-field min-h-36" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Что произошло и какого решения вы ожидаете?" maxLength={3000} />
            <button type="button" disabled={saving || reason.trim().length < 20} onClick={() => void handleOpen()} className="rounded-xl bg-status-danger py-3 font-bold text-white disabled:opacity-50">{saving ? 'Открываем…' : 'Открыть спор'}</button>
          </section>
        )}
        {dispute && (
          <>
            <section className={`rounded-2xl p-5 ${dispute.status === 'open' ? 'bg-status-warning/10' : 'bg-status-progress/10'}`}>
              <div className="flex gap-3"><Scale className="size-6 shrink-0 text-primary" /><div><h2 className="font-bold">{dispute.status === 'open' ? 'Спор рассматривается' : 'Спор разрешён'}</h2><p className="mt-1 text-sm text-muted-foreground">Открыл: {dispute.openedByAlias}</p></div></div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{dispute.reason}</p>
              {dispute.decisionSummary && <div className="mt-4 rounded-xl bg-card p-4"><p className="text-xs font-bold uppercase text-muted-foreground">Решение</p><p className="mt-2 text-sm">{dispute.decisionSummary}</p></div>}
            </section>
            <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]">
              <h2 className="font-bold">Доказательства</h2>
              {dispute.evidence.map((item) => <article key={item.id} className="rounded-xl bg-secondary p-3"><p className="text-xs font-bold text-muted-foreground">{item.authorAlias} · {formatDate(item.createdAt)}</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.description}</p>{item.sourceUrl && <a className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary" href={item.sourceUrl} target="_blank" rel="noreferrer">Открыть ссылку <ExternalLink className="size-3" /></a>}</article>)}
            </section>
            {dispute.status === 'open' && <section className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_4px_20px_rgb(var(--foreground-rgb)_/_0.06)]"><h2 className="flex items-center gap-2 font-bold"><FilePlus2 className="size-5 text-primary" /> Добавить доказательство</h2><textarea className="input-field min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Опишите фото, чек, сообщение или иной материал" maxLength={2000} /><input className="input-field" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://ссылка (необязательно)" /><button type="button" disabled={saving || description.trim().length < 5} onClick={() => void handleEvidence()} className="rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{saving ? 'Сохраняем…' : 'Добавить'}</button></section>}
          </>
        )}
      </main>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </PageLayout>
  );
}
function formatDate(value: string) { return new Date(value).toLocaleString('ru-RU'); }
