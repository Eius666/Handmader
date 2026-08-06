'use client';

import { useState } from 'react';
import { StarRating } from '@/components/ui/StarRating';

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
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: 480, margin: '0 auto',
          background: '#ffffff',
          borderRadius: '24px 24px 0 0',
          padding: '12px 20px 44px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 36, height: 4, borderRadius: 2,
            background: '#DDD0C4', margin: '0 auto 22px',
          }}
        />

        <h2
          style={{
            textAlign: 'center', fontSize: 20, fontWeight: 800,
            color: '#2D2D2D', margin: '0 0 4px', letterSpacing: '-0.02em',
          }}
        >
          Оцените мастера
        </h2>

        {masterName && (
          <p style={{ textAlign: 'center', fontSize: 14, color: '#78716c', margin: '0 0 22px' }}>
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
            background: 'rgba(255,248,240,0.8)',
            fontSize: 14, color: '#2D2D2D', resize: 'none',
            fontFamily: 'inherit', lineHeight: 1.5,
            boxSizing: 'border-box', marginBottom: 14,
            outline: 'none',
          }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!rating || sending}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: rating ? 'var(--primary)' : 'rgb(var(--primary-rgb) / 0.3)',
            color: '#ffffff', fontSize: 16, fontWeight: 700,
            border: 'none', cursor: rating ? 'pointer' : 'default',
            boxShadow: rating ? '0 6px 20px rgb(var(--primary-rgb) / 0.35)' : 'none',
            marginBottom: 10, transition: 'all 0.2s',
            letterSpacing: '-0.01em',
          }}
        >
          {sending ? 'Отправляем...' : 'Отправить оценку'}
        </button>

        <button
          type="button"
          onClick={onSkip}
          style={{
            width: '100%', padding: '12px', borderRadius: 14,
            background: 'transparent', color: '#78716c',
            fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}
        >
          Пропустить
        </button>
      </div>
    </div>
  );
}
