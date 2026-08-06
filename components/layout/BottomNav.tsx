'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
        background:            'rgba(248, 242, 234, 0.96)',
        backdropFilter:        'blur(24px)',
        WebkitBackdropFilter:  'blur(24px)',
        /* single clean top border — no bottom/side borders */
        borderTop:             '1px solid rgba(194, 112, 62, 0.10)',
        display:               'flex',
        alignItems:            'stretch',
        paddingTop:            4,
        paddingBottom:         0,
      }}
    >
      {/* Safe-area padding wrapper */}
      <div
        style={{
          display:             'flex',
          flex:                1,
          paddingBottom:       'env(safe-area-inset-bottom)',
        }}
      >
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
                transition:     'opacity 0.15s ease',
              }}
            >
              {/* Active indicator — thin pill above icon */}
              <span
                aria-hidden="true"
                style={{
                  position:     'absolute',
                  top:          0,
                  left:         '50%',
                  transform:    'translateX(-50%)',
                  width:        isActive ? 24 : 0,
                  height:       3,
                  borderRadius: 2,
                  background:   '#C2703E',
                  transition:   'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />

              <Icon
                size={isActive ? 22 : 21}
                strokeWidth={1.8}
                style={{
                  color:      isActive ? '#C2703E' : '#9C7E68',
                  transition: 'color 0.2s ease, transform 0.2s ease',
                  transform:  isActive ? 'translateY(-1px)' : 'none',
                }}
                aria-hidden="true"
              />

              <span
                style={{
                  fontSize:      10,
                  fontWeight:    isActive ? 700 : 500,
                  color:         isActive ? '#C2703E' : '#9C7E68',
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
