'use client';

import type { ReactNode } from 'react';
import { AuthGuard } from '@/features/auth/auth-guard';
import { SidebarShell } from '@/components/layout/sidebar-shell';
import { talentNav } from '@/features/talent/nav';

export default function TalentLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard role="TALENT">
      <SidebarShell nav={talentNav} variant="light" themeClass="theme-talent" homeHref="/talent/dashboard" notificationsHref="/talent/notifications" subtitle="Talent workspace">
        {children}
      </SidebarShell>
    </AuthGuard>
  );
}
