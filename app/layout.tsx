import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Comfortaa } from 'next/font/google';
import { AppShell } from '@/components/AppShell';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets:  ['latin', 'latin-ext'],
  weight:   ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display:  'swap',
});

// Warm round font for headings and logo — gives a handcrafted feel
const comfortaa = Comfortaa({
  subsets:  ['latin', 'cyrillic'],
  weight:   ['400', '600', '700'],
  variable: '--font-comfortaa',
  display:  'swap',
});

export const metadata: Metadata = {
  title:       'Handmader',
  description: 'Заказы на вязаные изделия',
};

export const viewport: Viewport = {
  width:         'device-width',
  initialScale:  1,
  maximumScale:  1,
  userScalable:  false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${jakarta.variable} ${comfortaa.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
