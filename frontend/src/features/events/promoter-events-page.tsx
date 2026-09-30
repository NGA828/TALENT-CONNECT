'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useAction, useDebounce } from '@/lib/hooks';
import type { EventItem, EventStatus, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/card';
import { Button, ButtonLink } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/form';
import { EmptyState, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { DateBlock, EventMeta } from './event-ui';

type List = Paginated<EventItem> & { counts: Partial<Record<EventStatus, number>> };
type Filter = 'ALL' | EventStatus;

export function PromoterEventsPage() {
  const [status, setStatus] = useState<Filter>('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<EventItem | null>(null);
  const dq = useDebounce(q);
  const state = useApi<List>('/events/mine', { status: status === 'ALL' ? undefined : status, q: dq, page, pageSize: 8 });
  const { busy, run } = useAction();
  const counts = state.data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  const publish = async (e: EventItem) => {
    const ok = await run(`pub-${e.id}`, () => api.post(`/events/${e.id}/publish`, {}), `“${e.title}” is now live.`);
    if (ok !== undefined) await state.reload();
  };
  const remove = async () => {
    if (!toDelete) return;
    const ok = await run('delete', () => api.del(`/events/${toDelete.id}`), 'Draft deleted.');
    setToDelete(null);
    if (ok !== undefined) await state.reload();
  };

  return (
    <>
      <PageHeader title="My events" description="Create events, publish them to talent and follow who enrols." actions={<ButtonLink href="/promoter/events/create"><CalendarPlus className="size-4" /> Create event</ButtonLink>} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Event status"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          items={[
            { value: 'ALL', label: 'All', count: state.data ? total : undefined },
            { value: 'DRAFT', label: 'Drafts', count: counts.DRAFT ?? 0 },
            { value: 'PUBLISHED', label: 'Published', count: counts.PUBLISHED ?? 0 },
            { value: 'ONGOING', label: 'Ongoing', count: counts.ONGOING ?? 0 },
            { value: 'COMPLETED', label: 'Completed', count: counts.COMPLETED ?? 0 },
            { value: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED ?? 0 },
          ]}
        />
        <SearchInput aria-label="Search events" className="w-full sm:w-64" placeholder="Search your events" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      <QueryState state={state} skeleton={<SkeletonRows rows={4} />}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState filtered={status !== 'ALL' || !!q} title={status !== 'ALL' || q ? 'No events in this view' : 'You have not created any events yet'} description="Events you publish are visible to every talent on the platform. Drafts stay private until you publish them." action={status === 'ALL' && !q ? <ButtonLink href="/promoter/events/create">Create your first event</ButtonLink> : undefined} />
          ) : (
            <>
              <div className="space-y-3">
                {data.items.map((e) => (
                  <article key={e.id} className="flex flex-wrap items-center gap-4 rounded-card border border-slate-200 bg-white p-4 shadow-xs sm:flex-nowrap sm:p-5">
                    <DateBlock iso={e.eventDate} />
                    <div className="min-w-0 flex-1 basis-64">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-slate-900"><Link href={`/promoter/events/${e.id}`} className="hover:text-accent-700 hover:underline">{e.title}</Link></h3>
                        <StatusBadge status={e.status} />
                      </div>
                      <EventMeta event={e} className="mt-1.5" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {e.status === 'DRAFT' && <Button size="sm" loading={busy === `pub-${e.id}`} onClick={() => void publish(e)}>Publish</Button>}
                      {(e.status === 'DRAFT' || e.status === 'PUBLISHED' || e.status === 'ONGOING') && <ButtonLink size="sm" variant="outline" href={`/promoter/events/${e.id}/edit`}><Pencil className="size-3.5" /> Edit</ButtonLink>}
                      <ButtonLink size="sm" variant="outline" href={`/promoter/events/${e.id}`}>Manage</ButtonLink>
                      {e.status === 'DRAFT' && e.enrollmentCount === 0 && e.contractCount === 0 && <Button size="sm" variant="ghost" aria-label={`Delete ${e.title}`} onClick={() => setToDelete(e)}><Trash2 className="size-4 text-red-600" /></Button>}
                    </div>
                  </article>
                ))}
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
            </>
          )
        }
      </QueryState>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="Delete this draft?" description={toDelete ? `“${toDelete.title}” will be permanently deleted. This cannot be undone.` : ''} confirmLabel="Delete draft" />
    </>
  );
}
