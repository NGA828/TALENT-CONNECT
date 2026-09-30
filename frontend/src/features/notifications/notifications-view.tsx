'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, CalendarDays, CheckCheck, CreditCard, FileSignature, MessageSquare, ScrollText, ShieldCheck, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import type { AppNotification, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';

export const notificationIcons: Record<string, typeof Bell> = { CONTRACT: FileSignature, EVENT: CalendarDays, LICENCE: ScrollText, PAYMENT: CreditCard, MESSAGE: MessageSquare, RATING: Star, ADMIN: ShieldCheck };

export function NotificationsView() {
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const state = useApi<Paginated<AppNotification>>('/notifications', { page, pageSize: 15, unread: filter === 'unread' ? 'true' : undefined }, { pollMs: 30000 });

  const markRead = async (n: AppNotification) => {
    if (n.isRead) return;
    try {
      await api.patch(`/notifications/${n.id}/read`);
      state.setData((prev) => (prev ? { ...prev, items: prev.items.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)) } : prev));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await api.patch('/notifications/read-all');
      toast.success('All notifications marked as read.');
      await state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about contracts, events, payments and verification."
        actions={<Button variant="outline" onClick={markAll} loading={busy}><CheckCheck className="size-4" /> Mark all as read</Button>}
      />
      <Tabs label="Notification filter" value={filter} onChange={(v) => { setFilter(v); setPage(1); }} items={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }]} className="mb-5" />
      <QueryState state={state} skeleton={<SkeletonRows rows={5} />}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState filtered={filter === 'unread'} title={filter === 'unread' ? 'You are all caught up' : 'No notifications yet'} description={filter === 'unread' ? 'There is nothing unread right now.' : 'When something happens on your account, it will show up here.'} />
          ) : (
            <>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-card border border-slate-200 bg-white">
                {data.items.map((n) => {
                  const Icon = notificationIcons[n.type] ?? Bell;
                  const body = (
                    <div className={cn('flex items-start gap-4 px-5 py-4', !n.isRead && 'bg-accent-50/50')}>
                      <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full', n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-accent-100 text-accent-700')}><Icon className="size-[18px]" /></span>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm text-slate-900', !n.isRead && 'font-semibold')}>{n.title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{n.message}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-xs text-slate-500">{timeAgo(n.sentAt)}</span>
                        {!n.isRead && <span className="size-2 rounded-full bg-accent-600" aria-label="Unread" />}
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => void markRead(n)} className="block transition-colors hover:bg-slate-50">{body}</Link>
                      ) : (
                        <button onClick={() => void markRead(n)} className="block w-full text-left transition-colors hover:bg-slate-50">{body}</button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
            </>
          )
        }
      </QueryState>
    </>
  );
}
