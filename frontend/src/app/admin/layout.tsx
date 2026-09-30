'use client';

import type { ReactNode } from 'react';
import { AuthGuard } from '@/features/auth/auth-guard';
import { AdminShell } from '@/components/layout/admin-shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard role="ADMIN">
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
