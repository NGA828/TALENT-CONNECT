'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, FileBarChart, Images, LayoutDashboard, Menu, ShieldCheck, Users, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Brand } from './brand';
import { UserMenu } from './user-menu';

const nav = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/promoters', label: 'Promoters', icon: ShieldCheck },
  { href: '/admin/portfolios', label: 'Portfolios', icon: Images },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/admin/monitoring', label: 'Monitoring', icon: Activity },
];

/** Admin console: dense top-navigation layout, deliberately different from the two sidebar workspaces. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="theme-admin min-h-screen bg-slate-100 text-[15px]">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
          <Brand href="/admin/dashboard" tone="dark" className="text-base" />
          <span className="hidden rounded bg-accent-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent-300 sm:inline">Admin console</span>
          <nav aria-label="Main" className="ml-2 hidden items-stretch gap-1 lg:flex">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('relative flex h-14 items-center gap-2 px-3 text-sm font-medium transition-colors', active ? 'text-white' : 'text-slate-400 hover:text-white')}>
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                  {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent-500" />}
                </Link>
              );
            })}
          </nav>
          <div className="flex-1" />
          <UserMenu tone="dark" />
          <button onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open && (
          <nav aria-label="Mobile" className="animate-fade-in border-t border-slate-800 px-3 py-2 lg:hidden">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium', active ? 'bg-white/10 text-white' : 'text-slate-300')}>
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
