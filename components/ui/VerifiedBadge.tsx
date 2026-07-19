'use client';

import { BadgeCheck } from 'lucide-react';

interface Props {
  size?: 'sm' | 'md';
}

export function VerifiedBadge({ size = 'sm' }: Props) {
  const sm = size === 'sm';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full whitespace-nowrap"
      style={{
        background:    '#EBF5EE',
        color:         '#3E7A4A',
        fontSize:      sm ? 10 : 12,
        fontWeight:    700,
        letterSpacing: '0.02em',
        padding:       sm ? '2px 7px' : '4px 10px',
        lineHeight:    1.4,
      }}
    >
      <BadgeCheck size={sm ? 10 : 13} strokeWidth={2.5} aria-hidden="true" />
      Проверен
    </span>
  );
}
