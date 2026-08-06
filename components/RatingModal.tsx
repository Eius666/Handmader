'use client';

import { useState } from 'react';
import { StarRating } from '@/components/ui/StarRating';
import { Modal } from '@/components/motion/Modal';
import { PressableButton } from '@/components/motion/Pressable';

interface Props {
  masterName?: string;
  onSend: (rating: number, comment: string) => Promise<void>;
  onSkip: () => void;
}

export function RatingModal({ masterName, onSend, onSkip }: Props) {
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!rating) return;
    setSending(true);
    try {
      await onSend(rating, comment.trim());
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open onClose={onSkip} sheet>
      <div
        style={{
          width: '100%',
          background: 'var(--card)',
          borderRadius: '24px 24px 0 0',
          padding: '12px 20px 44px',
          boxShadow: 'var(--shadow-float)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'var(--border)', margin: '0 auto 22px',
          }}
        />

        <h2 className="font-display" style={{ textAlign: 'center', fontSize: 21, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 4px' }}>
          Оцените мастера
        </h2>

        {masterName && (
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted-foreground)', margin: '0 0 22px' }}>
            {masterName}
          </p>
        )}

        {/* Stars — large, interactive */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <StarRating value={rating} size={44} onChange={setRating} />
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Комментарий (необязательно)..."
          rows={3}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: '1.5px solid rgb(var(--foreground-rgb) / 0.18)',
            background: 'rgb(var(--background-rgb) / 0.8)',
            fontSize: 14, color: 'var(--foreground)', resize: 'none',
            fontFamily: 'inherit', lineHeight: 1.5,
            boxSizing: 'border-box', marginBottom: 14,
            outline: 'none',
          }}
        />

        <PressableButton
          type="button"
          onClick={handleSend}
          disabled={!rating || sending}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: rating ? 'var(--primary)' : 'rgb(var(--primary-rgb) / 0.3)',
            color: 'var(--primary-foreground)', fontSize: 16, fontWeight: 700,
            border: 'none', cursor: rating ? 'pointer' : 'default',
            boxShadow: rating ? 'var(--shadow-primary)' : 'none',
            marginBottom: 10,
            letterSpacing: '-0.01em',
          }}
        >
          {sending ? 'Отправляем...' : 'Отправить оценку'}
        </PressableButton>

        <PressableButton
          type="button"
          onClick={onSkip}
          style={{
            width: '100%', padding: '12px', borderRadius: 14,
            background: 'transparent', color: 'var(--muted-foreground)',
            fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          Пропустить
        </PressableButton>
      </div>
    </Modal>
  );
}
