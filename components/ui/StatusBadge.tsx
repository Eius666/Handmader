'use client';

import { motion } from 'motion/react';
import { Clock, UserCheck, Scissors, Sparkles, CheckCheck, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { OrderStatus } from '@/types';

interface StatusCfg {
  label: string;
  Icon:  LucideIcon;
  tone:  'gold' | 'success';
}

const STATUS_CONFIG: Record<OrderStatus, StatusCfg> = {
  awaiting_responses: { label: 'ожидает',       Icon: Clock,      tone: 'gold' },
  master_selected:    { label: 'мастер выбран',  Icon: UserCheck,  tone: 'success' },
  in_progress:        { label: 'в работе',       Icon: Scissors,   tone: 'success' },
  ready:              { label: 'готово',          Icon: Sparkles,   tone: 'gold' },
  delivered:          { label: 'доставлен',       Icon: Truck,      tone: 'gold' },
  completed:          { label: 'завершён',        Icon: CheckCheck, tone: 'success' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, Icon: Clock, tone: 'gold' as const };
  const { Icon } = cfg;
  const rgbVar = cfg.tone === 'gold' ? '--gold-rgb' : '--success-rgb';
  const colorVar = cfg.tone === 'gold' ? '--gold' : '--success';

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full"
      style={{
        background:    `rgb(var(${rgbVar}) / 14%)`,
        color:         `var(${colorVar})`,
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: '0.03em',
        padding:       '4px 9px',
        lineHeight:    1.2,
      }}
    >
      <Icon size={10} strokeWidth={2.5} aria-hidden="true" />
      {cfg.label}
    </motion.span>
  );
}
