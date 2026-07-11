import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/hooks/useAuth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Handmader',
  description: 'Заказы на вязаные изделия',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0 }}>
        <AuthProvider>
          <div id="app-root">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
