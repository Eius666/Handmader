'use client';

import { UserRole } from '@/types';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { PressableButton, PopIn } from '@/components/motion/Pressable';

const OPTIONS: { role: UserRole; emoji: string; title: string; desc: string }[] = [
  { role: 'customer', emoji: '🛍️', title: 'Заказчик',   desc: 'Создаю заказы на вязаные изделия' },
  { role: 'master',   emoji: '🧶', title: 'Мастер',     desc: 'Выполняю заказы, зарабатываю на хобби' },
  { role: 'both',     emoji: '✨', title: 'Обе роли',   desc: 'И заказываю, и выполняю заказы' },
];

interface RoleSelectorProps {
  value?: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}

export function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
  return (
    <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {OPTIONS.map((r) => {
        const active = value === r.role;
        return (
          <StaggerItem key={r.role}>
            <PressableButton
              onClick={() => onChange(r.role)}
              disabled={disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px', borderRadius: 16, width: '100%', textAlign: 'left',
                border:     active ? '2px solid var(--primary)' : '2px solid var(--border)',
                background: active ? 'rgb(var(--primary-rgb) / 8%)' : 'var(--card)',
                cursor:     disabled ? 'default'          : 'pointer',
                opacity:    disabled ? 0.65               : 1,
                boxShadow:  active
                  ? '0 2px 12px rgb(var(--primary-rgb) / 0.18)'
                  : '0 1px 6px rgb(var(--foreground-rgb) / 0.06)',
              }}
            >
              <span style={{ fontSize: 32, flexShrink: 0 }}>{r.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: active ? 'var(--primary)' : 'var(--foreground)', marginBottom: 3 }}>
                  {r.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.4 }}>{r.desc}</div>
              </div>
              {active && (
                <PopIn style={{ color: 'var(--primary)', fontSize: 20, flexShrink: 0 }}>✓</PopIn>
              )}
            </PressableButton>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
