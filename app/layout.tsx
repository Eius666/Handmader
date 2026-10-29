import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource-variable/caveat';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/400-italic.css';
import '@fontsource/spectral/500.css';
import '@fontsource/spectral/500-italic.css';
import '@fontsource/spectral/600.css';
import '@fontsource/spectral/600-italic.css';
import '@fontsource/spectral/700.css';
import '@fontsource/spectral/700-italic.css';
import '@fontsource/spectral/800.css';
import '@fontsource/spectral/800-italic.css';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title:       'Вязубер',
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
    <html lang="ru">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
