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
    <span className="inline-flex" style={{ gap: 2 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <motion.span
          key={star}
          onClick={() => onChange?.(star)}
          whileTap={onChange ? { scale: 1.3 } : undefined}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          style={{
            fontSize: size,
            color: star <= value ? 'var(--gold)' : 'var(--border)',
            cursor: onChange ? 'pointer' : 'default',
            lineHeight: 1,
          }}
        >
          ★
        </motion.span>
      ))}
    </span>
  );
}
