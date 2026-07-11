'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const CUSTOMER_NAV: NavItem[] = [
  { href: '/home', icon: '🏠', label: 'Главная' },
  { href: '/orders', icon: '📋', label: 'Заказы' },
  { href: '/profile', icon: '👤', label: 'Профиль' },
];

const MASTER_NAV: NavItem[] = [
  { href: '/feed', icon: '🧶', label: 'Лента' },
  { href: '/my-responses', icon: '📋', label: 'Отклики' },
  { href: '/profile', icon: '👤', label: 'Профиль' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isMaster = user?.role === 'master';
  const isBoth = user?.role === 'both';

  const items = isMaster ? MASTER_NAV : CUSTOMER_NAV;
  const extraItem: NavItem | null =
    isBoth ? { href: '/feed', icon: '🧶', label: 'Лента' } : null;

  const allItems = extraItem ? [...CUSTOMER_NAV.slice(0, 2), extraItem, CUSTOMER_NAV[2]] : items;

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--nav-height)',
        background: '#FFFFFF',
        borderTop: '1px solid #EDE0D4',
        display: 'flex',
        alignItems: 'center',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {allItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              textDecoration: 'none',
              paddingTop: 8,
              paddingBottom: 4,
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
            {isActive && (
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  marginTop: 1,
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
