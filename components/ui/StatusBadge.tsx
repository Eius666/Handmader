'use client';

import { OrderStatus } from '@/types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; color: string; dot: string }> = {
  awaiting_responses: { label: 'ожидает',   bg: 'rgba(200,124,62,0.12)', color: '#c87c3e', dot: '#c87c3e' },
  master_selected:    { label: 'мастер',     bg: 'rgba(74,124,89,0.12)',  color: '#4a7c59', dot: '#4a7c59' },
  in_progress:        { label: 'в работе',   bg: 'rgba(74,124,89,0.12)',  color: '#4a7c59', dot: '#4a7c59' },
  ready:              { label: 'готов',      bg: 'rgba(217,108,82,0.12)', color: '#d96c52', dot: '#d96c52' },
  delivered:          { label: 'доставлен',  bg: 'rgba(200,124,62,0.12)', color: '#c87c3e', dot: '#c87c3e' },
  completed:          { label: 'завершён',   bg: 'rgba(74,124,89,0.12)',  color: '#4a7c59', dot: '#4a7c59' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status, bg: 'rgba(120,113,108,0.1)', color: '#78716c', dot: '#78716c',
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: cfg.dot, opacity: 0.8 }}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}
