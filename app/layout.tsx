import type { Metadata, Viewport } from 'next';
import { Manrope, Spectral, Caveat } from 'next/font/google';
import { AppShell } from '@/components/AppShell';
import './globals.css';

// Body — geometric-humanist sans, clean and highly legible
const manrope = Manrope({
  subsets:  ['cyrillic', 'cyrillic-ext', 'latin', 'latin-ext'],
  weight:   ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display:  'swap',
});

// Display — warm literary serif for headings, prices, brand name
const spectral = Spectral({
  subsets:  ['cyrillic', 'cyrillic-ext', 'latin', 'latin-ext'],
  weight:   ['400', '500', '600', '700', '800'],
  style:    ['normal', 'italic'],
  variable: '--font-spectral',
  display:  'swap',
});

// Accent — a single handwritten "signature" touch, used sparingly
const caveat = Caveat({
  subsets:  ['cyrillic', 'latin'],
  weight:   ['600', '700'],
  variable: '--font-caveat',
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
    <html lang="ru" className={`${manrope.variable} ${spectral.variable} ${caveat.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
