import Link from 'next/link';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import type { AppNotification } from '@/lib/types';
import { notificationIcons } from './notifications-view';

export function RecentNotifications({ items, allHref }: { items: AppNotification[]; allHref: string }) {
  if (!items.length) return <p className="px-5 py-8 text-center text-sm text-slate-500">You are all caught up.</p>;
  return (
    <>
      <ul className="divide-y divide-slate-100">
        {items.map((n) => {
          const Icon = notificationIcons[n.type] ?? Bell;
          return (
            <li key={n.id}>
              <Link href={n.link ?? allHref} className="flex gap-3 px-5 py-3 hover:bg-slate-50">
                <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-accent-50 text-accent-700')}><Icon className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm', n.isRead ? 'text-slate-700' : 'font-semibold text-slate-900')}>{n.title}</span>
                  <span className="block truncate text-xs text-slate-500">{n.message}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(n.sentAt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href={allHref} className="block border-t border-slate-100 px-5 py-3 text-center text-sm font-medium text-accent-700 hover:bg-slate-50">View all notifications</Link>
    </>
  );
}
