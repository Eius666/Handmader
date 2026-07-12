'use client';

import { cn } from '@/lib/utils';
import { OrderStatus } from '@/types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  awaiting_responses: { label: 'ожидает',   className: 'bg-status-waiting text-status-waiting-foreground' },
  master_selected:    { label: 'мастер',     className: 'bg-status-progress text-status-progress-foreground' },
  in_progress:        { label: 'в работе',   className: 'bg-status-progress text-status-progress-foreground' },
  ready:              { label: 'готов',      className: 'bg-primary text-primary-foreground' },
  delivered:          { label: 'доставлен',  className: 'bg-status-waiting text-status-waiting-foreground' },
  completed:          { label: 'завершён',   className: 'bg-status-progress text-status-progress-foreground' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-secondary text-foreground' };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        cfg.className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-90" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
