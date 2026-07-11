'use client';

import { OrderStatus, STATUS_LABELS } from '@/types';

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  awaiting_responses: { bg: '#FFF3E0', text: '#E07A5F' },
  master_selected:    { bg: '#E8F5E9', text: '#388E3C' },
  in_progress:        { bg: '#E3F2FD', text: '#1565C0' },
  ready:              { bg: '#F3E5F5', text: '#6A1B9A' },
  delivered:          { bg: '#FFF8E1', text: '#F57F17' },
  completed:          { bg: '#E8F5E9', text: '#2E7D32' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
