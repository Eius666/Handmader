import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import { AppShell } from '@/components/AppShell';
import './globals.css';

// Body — clean, highly legible, modern
const jakarta = Plus_Jakarta_Sans({
  subsets:  ['latin', 'latin-ext'],
  weight:   ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display:  'swap',
});

// Display — editorial serif with Cyrillic, gives the handmade/boutique feel
const playfair = Playfair_Display({
  subsets:  ['latin', 'cyrillic'],
  weight:   ['400', '500', '600', '700', '800', '900'],
  style:    ['normal', 'italic'],
  variable: '--font-playfair',
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
    <html lang="ru" className={`${jakarta.variable} ${playfair.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
