'use client';

import { Clock, UserCheck, Scissors, Sparkles, CheckCheck, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { OrderStatus } from '@/types';

interface StatusCfg {
  label:   string;
  Icon:    LucideIcon;
  bg:      string;
  color:   string;
}

const STATUS_CONFIG: Record<OrderStatus, StatusCfg> = {
  awaiting_responses: { label: 'ожидает',       Icon: Clock,      bg: '#FEF0E2', color: '#B85E28' },
  master_selected:    { label: 'мастер выбран',  Icon: UserCheck,  bg: '#E8F2EA', color: '#3E7A4A' },
  in_progress:        { label: 'в работе',       Icon: Scissors,   bg: '#E8F2EA', color: '#3E7A4A' },
  ready:              { label: 'готово',          Icon: Sparkles,   bg: '#FEF0E2', color: '#B85E28' },
  delivered:          { label: 'доставлен',       Icon: Truck,      bg: '#FEF0E2', color: '#B85E28' },
  completed:          { label: 'завершён',        Icon: CheckCheck, bg: '#E8F2EA', color: '#3E7A4A' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status, Icon: Clock, bg: '#F0ECE8', color: '#9C7E68',
  };
  const { Icon } = cfg;

  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full"
      style={{
        background:    cfg.bg,
        color:         cfg.color,
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: '0.03em',
        padding:       '4px 9px',
        lineHeight:    1.2,
      }}
    >
      <Icon size={10} strokeWidth={2.5} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
