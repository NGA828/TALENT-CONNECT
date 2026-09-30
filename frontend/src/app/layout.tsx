import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/features/auth/auth-context';
import { ToastProvider } from '@/lib/toast';

export const metadata: Metadata = {
  title: { default: 'Talent Connect — book verified live talent', template: '%s · Talent Connect' },
  description: 'Talent Connect is the marketplace where photographers, DJs, dancers, MCs and crews meet licence-verified promoters and event agencies.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b1220' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
