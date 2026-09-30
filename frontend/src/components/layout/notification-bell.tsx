import Link from 'next/link';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/cn';

export function NotificationBell({ href, count, tone = 'light' }: { href: string; count: number; tone?: 'light' | 'dark' }) {
  return (
    <Link href={href} aria-label={count ? `Notifications, ${count} unread` : 'Notifications'} className={cn('relative rounded-xl p-2.5 transition-colors', tone === 'dark' ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-slate-100')}>
      <Bell className="size-5" />
      {count > 0 && <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">{count > 9 ? '9+' : count}</span>}
    </Link>
  );
}
