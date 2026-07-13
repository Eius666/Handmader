'use client';

interface Props {
  title: string;
  body?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  body,
  confirmLabel = 'Удалить',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-[28px] bg-background px-5 pb-10 pt-5"
        style={{ boxShadow: '0 -8px 40px rgba(45,45,45,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />

        <p className="mb-1 text-[18px] font-extrabold text-foreground">{title}</p>
        {body && (
          <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-secondary py-3.5 text-[15px] font-bold text-foreground transition-all active:scale-[0.98]"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-3.5 text-[15px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: '#c0392b', boxShadow: '0 4px 14px rgba(192,57,43,0.35)' }}
          >
            {loading ? 'Удаляем...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
