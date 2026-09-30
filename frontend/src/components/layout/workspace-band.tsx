import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  /** Written-out role name, so the workspace is never identified by colour alone. */
  label: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  /** Custom body, used by the Talent dashboard whose hero needs richer content. */
  children?: ReactNode;
  className?: string;
}

/**
 * The role-tinted band that opens each dashboard. One component for all three
 * workspaces: the colour comes from the shell's own theme class, never from
 * props, so Talent renders indigo, Promoter teal and Admin amber without any
 * per-role branching here.
 */
export function WorkspaceBand({ label, title, description, actions, children, className }: Props) {
  return (
    <section className={cn('rounded-card border border-tint-border bg-tint p-5 sm:p-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-accent-700 uppercase">
            <span className="size-2 rounded-full bg-accent-600" aria-hidden />
            {label}
          </p>
          {title && <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>}
          {description && <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
