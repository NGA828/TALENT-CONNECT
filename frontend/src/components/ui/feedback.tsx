'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw, ShieldAlert, SearchX } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ApiError } from '@/lib/api';
import { Button } from './button';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <Loader2 className={cn('size-5 animate-spin text-accent-600', className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-slate-200/70', className)} />;
}

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function SkeletonCards({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-56 w-full rounded-card" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function EmptyState({ title, description, action, icon, className, filtered }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode; className?: string; filtered?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-card border border-dashed border-slate-300 bg-white px-6 py-14 text-center', className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">{icon ?? (filtered ? <SearchX className="size-6" /> : <Inbox className="size-6" />)}</div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: ApiError | Error | null; onRetry?: () => void; className?: string }) {
  const status = error instanceof ApiError ? error.status : 500;
  const forbidden = status === 403;
  const notFound = status === 404;
  const title = forbidden ? 'Access denied' : notFound ? 'Not found' : status === 0 ? 'You appear to be offline' : 'Something went wrong';
  const Icon = forbidden ? ShieldAlert : AlertTriangle;
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center rounded-card border border-red-200 bg-red-50/50 px-6 py-12 text-center', className)}>
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-600">{error?.message ?? 'An unexpected error occurred.'}</p>
      {onRetry && !forbidden && !notFound && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

interface QueryStateProps<T> {
  state: { data: T | undefined; error: ApiError | null; loading: boolean; reload: () => Promise<void> };
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}

/** Renders the loading skeleton, error card (with retry) or the data – the three states every API page needs. */
export function QueryState<T>({ state, skeleton, children }: QueryStateProps<T>) {
  if (state.loading) return <>{skeleton ?? <SkeletonRows />}</>;
  if (state.error && !state.data) return <ErrorState error={state.error} onRetry={() => void state.reload()} />;
  if (state.data === undefined) return null;
  return <>{children(state.data)}</>;
}

export function Alert({ tone = 'info', title, children, className }: { tone?: 'info' | 'warning' | 'success' | 'danger'; title?: string; children?: ReactNode; className?: string }) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
  } as const;
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-xl border px-4 py-3 text-sm', tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && 'mt-0.5', 'leading-relaxed')}>{children}</div>}
    </div>
  );
}
