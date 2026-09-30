'use client';

import type { ReactNode } from 'react';
import { AuthGuard } from '@/features/auth/auth-guard';
import { SidebarShell } from '@/components/layout/sidebar-shell';
import { promoterNav } from '@/features/promoter/nav';

export default function PromoterLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard role="PROMOTER">
      <SidebarShell nav={promoterNav} variant="dark" themeClass="theme-promoter" homeHref="/promoter/dashboard" notificationsHref="/promoter/notifications" subtitle="Promoter studio">
        {children}
      </SidebarShell>
    </AuthGuard>
  );
}
