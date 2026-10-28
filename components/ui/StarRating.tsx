'use client';

import { motion } from 'motion/react';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: number;
  onChange?: (v: number) => void;
}

export function StarRating({ value, max = 5, size = 16, onChange }: StarRatingProps) {
  return (
    <span
      className="inline-flex"
      style={{ gap: 2 }}
      aria-label={`Рейтинг: ${value} из ${max}`}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => {
        const style = {
          fontSize: size,
          color: star <= value ? 'var(--gold)' : 'var(--border)',
          lineHeight: 1,
        };

        if (!onChange) {
          return (
            <span key={star} aria-hidden="true" style={style}>
              ★
            </span>
          );
        }

        return (
          <motion.button
            key={star}
            type="button"
            aria-label={`${star} из ${max}`}
            aria-pressed={star === value}
            onClick={() => onChange(star)}
            whileTap={{ scale: 1.3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="rounded-sm bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{ ...style, cursor: 'pointer', border: 0 }}
          >
            <span aria-hidden="true">★</span>
          </motion.button>
        );
      })}
    </span>
  );
}
