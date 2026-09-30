'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import type { Role } from '@/lib/types';
import { Spinner } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { homeFor, useAuth } from './auth-context';

/** Client-side route guard. The API enforces the same rules – this only avoids showing screens a user cannot use. */
export function AuthGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner className="size-7" label="Checking your session" />
      </div>
    );
  }

  if (user.role !== role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="text-xl font-bold">This area is not available for your account</h1>
        <p className="max-w-md text-sm text-slate-600">You are signed in as a {user.role.toLowerCase()}. The page you requested belongs to a different role.</p>
        <div className="flex gap-2">
          <ButtonLink href={homeFor(user.role)}>Go to my dashboard</ButtonLink>
          <Link href="/" className="inline-flex h-10 items-center px-4 text-sm font-medium text-slate-600 hover:text-slate-900">Home</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
