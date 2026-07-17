'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, User, Package, MessageSquareText, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const CUSTOMER_ITEMS: NavItem[] = [
  { href: '/home',    label: 'Главная',  icon: Home },
  { href: '/chats',   label: 'Чаты',    icon: MessageSquare },
  { href: '/orders',  label: 'Заказы',  icon: ClipboardList },
  { href: '/profile', label: 'Профиль', icon: User },
];

const MASTER_ITEMS: NavItem[] = [
  { href: '/feed',         label: 'Заказы',   icon: Package },
  { href: '/chats',        label: 'Чаты',     icon: MessageSquare },
  { href: '/my-responses', label: 'Отклики',  icon: MessageSquareText },
  { href: '/profile',      label: 'Профиль',  icon: User },
];

const BOTH_ITEMS: NavItem[] = [
  { href: '/home',    label: 'Главная',  icon: Home },
  { href: '/feed',    label: 'Лента',    icon: Package },
  { href: '/chats',   label: 'Чаты',    icon: MessageSquare },
  { href: '/profile', label: 'Профиль', icon: User },
];

function triggerHaptic() {
  try {
    (window as Window & { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void } } } })
      .Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  } catch { /* not in Telegram */ }
}

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items =
    user?.role === 'master' ? MASTER_ITEMS :
    user?.role === 'both'   ? BOTH_ITEMS   :
    CUSTOMER_ITEMS;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex justify-center pb-4 px-4"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="flex w-full max-w-sm items-center justify-around rounded-[22px] px-2 py-2"
        style={{
          background:          'rgba(255,255,255,0.88)',
          backdropFilter:      'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          border:              '1px solid rgba(180,100,70,0.1)',
          boxShadow:           '0 8px 32px rgba(140,80,50,0.12), 0 1px 0 rgba(255,255,255,0.8) inset',
          pointerEvents:       'auto',
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={triggerHaptic}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 no-underline',
                'min-w-[56px] transition-all duration-300',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
              style={{
                background: isActive ? 'rgba(217,108,82,0.1)' : 'transparent',
                transition: 'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            >
              <Icon
                className={cn(
                  'size-5 transition-all duration-300',
                  isActive ? 'fill-primary/20 text-primary scale-110' : 'scale-100',
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'text-[10px] font-semibold tracking-tight leading-none',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <span
                  aria-hidden="true"
                  style={{
                    position:        'absolute',
                    bottom:          3,
                    left:            '50%',
                    transform:       'translateX(-50%)',
                    width:           4,
                    height:          4,
                    borderRadius:    '50%',
                    background:      '#C2703E',
                    opacity:         0.7,
                    transition:      'all 0.3s ease-out',
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
