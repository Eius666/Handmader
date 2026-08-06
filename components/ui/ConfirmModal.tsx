'use client';

import { Modal } from '@/components/motion/Modal';
import { PressableButton } from '@/components/motion/Pressable';

interface Props {
  open?: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open = true,
  title,
  body,
  confirmLabel = 'Удалить',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} sheet>
      <div
        className="w-full rounded-t-[28px] px-5 pb-10 pt-5"
        style={{ background: 'var(--background)', boxShadow: 'var(--shadow-float)' }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full" style={{ background: 'var(--border)' }} />

        <p className="font-display mb-1 text-[19px] font-semibold text-foreground">{title}</p>
        {body && (
          <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
        )}

        <div className="flex gap-3 pt-2">
          <PressableButton
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl py-3.5 text-[15px] font-bold text-foreground"
            style={{ background: 'var(--secondary)' }}
          >
            Отмена
          </PressableButton>
          <PressableButton
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-3.5 text-[15px] font-bold disabled:opacity-60"
            style={{ background: 'var(--danger)', color: 'var(--danger-foreground)', boxShadow: '0 4px 14px rgb(var(--danger-rgb) / 32%)' }}
          >
            {loading ? 'Удаляем...' : confirmLabel}
          </PressableButton>
        </div>
      </div>
    </Modal>
  );
}
