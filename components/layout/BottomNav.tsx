'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, User, Package, MessageSquareText } from 'lucide-react';
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
  { href: '/orders',  label: 'Заказы',   icon: ClipboardList },
  { href: '/profile', label: 'Профиль',  icon: User },
];

const MASTER_ITEMS: NavItem[] = [
  { href: '/feed',         label: 'Заказы',   icon: Package },
  { href: '/my-responses', label: 'Отклики',  icon: MessageSquareText },
  { href: '/profile',      label: 'Профиль',  icon: User },
];

const BOTH_ITEMS: NavItem[] = [
  { href: '/home',         label: 'Главная',  icon: Home },
  { href: '/orders',       label: 'Заказы',   icon: ClipboardList },
  { href: '/feed',         label: 'Лента',    icon: Package },
  { href: '/profile',      label: 'Профиль',  icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const items =
    user?.role === 'master'  ? MASTER_ITEMS   :
    user?.role === 'both'    ? BOTH_ITEMS      :
    CUSTOMER_ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-border bg-card/95 backdrop-blur">
      <ul className="flex items-center justify-around px-4 pb-6 pt-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-w-16 flex-col items-center gap-1 rounded-2xl px-4 py-1.5 transition-colors no-underline',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon
                  className={cn('size-6', isActive && 'fill-primary/15')}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
