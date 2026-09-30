'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';
import { humanize } from '@/lib/format';

export function UserMenu({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn('flex items-center gap-2 rounded-xl p-1.5 pr-2.5 transition-colors', tone === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100')}
      >
        <Avatar firstName={user.firstName} lastName={user.lastName} src={user.avatarUrl} size={32} />
        <span className="hidden text-left sm:block">
          <span className={cn('block text-[13px] font-semibold leading-tight', tone === 'dark' ? 'text-white' : 'text-slate-900')}>{user.firstName} {user.lastName}</span>
          <span className={cn('block text-xs leading-tight', tone === 'dark' ? 'text-slate-400' : 'text-slate-500')}>{humanize(user.role)}</span>
        </span>
        <ChevronDown className={cn('size-4', tone === 'dark' ? 'text-slate-400' : 'text-slate-500')} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="animate-fade-in absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            role="menuitem"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
