'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Home, ClipboardList, User, Package, MessageSquareText, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

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
  { href: '/home',         label: 'Главная',  icon: Home },
  { href: '/feed',         label: 'Лента',    icon: Package },
  { href: '/my-responses', label: 'Отклики', icon: MessageSquareText },
  { href: '/chats',        label: 'Чаты',    icon: MessageSquare },
  { href: '/profile',      label: 'Профиль', icon: User },
];

function triggerHaptic() {
  try {
    (window as Window & { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void } } } })
      .Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  } catch { /* not in Telegram */ }
}

export function BottomNav() {
  const pathname = usePathname();
  const { user }  = useAuth();

  const items =
    user?.role === 'master' ? MASTER_ITEMS :
    user?.role === 'both'   ? BOTH_ITEMS   :
    CUSTOMER_ITEMS;

  return (
    <nav
      aria-label="Главная навигация"
      style={{
        position:              'fixed',
        bottom:                0,
        left:                  0,
        right:                 0,
        zIndex:                10,
        background:            'rgb(var(--background-rgb) / 96%)',
        backdropFilter:        'blur(24px)',
        WebkitBackdropFilter:  'blur(24px)',
        borderTop:             '1px solid rgb(var(--primary-rgb) / 10%)',
        display:               'flex',
        alignItems:            'stretch',
        paddingTop:            4,
        paddingBottom:         0,
      }}
    >
      {/* Safe-area padding wrapper */}
      <div style={{ display: 'flex', flex: 1, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {items.map((item) => {
          const Icon     = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={triggerHaptic}
              aria-current={isActive ? 'page' : undefined}
              style={{
                flex:           1,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            3,
                paddingTop:     8,
                paddingBottom:  10,
                textDecoration: 'none',
                position:       'relative',
              }}
            >
              {/* Active indicator — a single pill that morphs between tabs */}
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-active-pill"
                  aria-hidden="true"
                  style={{
                    position:     'absolute',
                    top:          0,
                    width:        24,
                    height:       3,
                    borderRadius: 2,
                    background:   'var(--primary)',
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}

              <motion.div
                animate={{ y: isActive ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 24 }}
              >
                <Icon
                  size={isActive ? 22 : 21}
                  strokeWidth={1.75}
                  style={{ color: isActive ? 'var(--primary)' : 'var(--muted-foreground)' }}
                  aria-hidden="true"
                />
              </motion.div>

              <span
                style={{
                  fontSize:      10,
                  fontWeight:    isActive ? 700 : 500,
                  color:         isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                  letterSpacing: '0.02em',
                  lineHeight:    1,
                  transition:    'color 0.2s ease, font-weight 0.2s ease',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
