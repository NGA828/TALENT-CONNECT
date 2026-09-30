'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Brand } from './brand';
import { NotificationBell } from './notification-bell';
import { UserMenu } from './user-menu';
import { useUnreadCounts } from '@/features/notifications/use-counts';

export interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: 'messages' | 'notifications';
}

interface Props {
  nav: NavEntry[];
  variant: 'light' | 'dark';
  themeClass: string;
  homeHref: string;
  notificationsHref: string;
  subtitle: string;
  children: ReactNode;
}

/** Sidebar layout used by the Talent (light) and Promoter (dark) workspaces. */
export function SidebarShell({ nav, variant, themeClass, homeHref, notificationsHref, subtitle, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const counts = useUnreadCounts(true);
  const dark = variant === 'dark';

  useEffect(() => setOpen(false), [pathname]);

  const list = (
    <nav aria-label="Main" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const n = item.badge === 'messages' ? counts.messages : item.badge === 'notifications' ? counts.notifications : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              dark
                ? active ? 'bg-accent-600/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                : active ? 'bg-accent-50 text-accent-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <item.icon className={cn('size-[18px]', active ? (dark ? 'text-accent-300' : 'text-accent-600') : dark ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-600')} aria-hidden />
            <span className="flex-1">{item.label}</span>
            {n > 0 && <span className="rounded-full bg-accent-600 px-1.5 text-[11px] font-semibold leading-5 text-white">{n > 99 ? '99+' : n}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const sidebar = (
    <div className={cn('flex h-full flex-col', dark ? 'bg-ink text-white' : 'border-r border-slate-200 bg-white')}>
      <div className={cn('flex h-16 items-center justify-between px-5', dark ? 'border-b border-white/10' : 'border-b border-slate-100')}>
        <Brand href={homeHref} tone={dark ? 'dark' : 'light'} />
      </div>
      <p className={cn('px-6 pt-4 text-[11px] font-semibold uppercase tracking-wider', dark ? 'text-slate-500' : 'text-slate-400')}>{subtitle}</p>
      {list}
    </div>
  );

  return (
    <div className={cn('min-h-screen bg-slate-50', themeClass)}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="animate-fade-in absolute inset-y-0 left-0 w-72 max-w-[85%]">
            {sidebar}
            <button onClick={() => setOpen(false)} aria-label="Close menu" className={cn('absolute right-3 top-4 rounded-lg p-2', dark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100')}>
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <NotificationBell href={notificationsHref} count={counts.notifications} />
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
