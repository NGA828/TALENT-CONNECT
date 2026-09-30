'use client';

import { useState } from 'react';
import { CalendarX, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useAction, useDebounce } from '@/lib/hooks';
import type { EventItem, Paginated, PublicMeta } from '@/lib/types';
import { PageHeader } from '@/components/ui/card';
import { Button, ButtonLink } from '@/components/ui/button';
import { Select, SearchInput, Input } from '@/components/ui/form';
import { EmptyState, QueryState, SkeletonCards } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/modal';
import { EventCard } from './event-ui';

type View = 'browse' | 'upcoming' | 'past';

export function TalentEventsPage() {
  const [view, setView] = useState<View>('browse');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState<'date' | 'newest'>('date');
  const [page, setPage] = useState(1);
  const [withdraw, setWithdraw] = useState<EventItem | null>(null);
  const dq = useDebounce(q);
  const dl = useDebounce(location);
  const meta = useApi<PublicMeta>('/public/meta');
  const { busy, run } = useAction();

  const browse = useApi<Paginated<EventItem>>(view === 'browse' ? '/events' : '/events/enrolled/mine', view === 'browse' ? { q: dq, category, location: dl, sort, page, pageSize: 9 } : { when: view, page, pageSize: 9 });

  const reset = (v: View) => { setView(v); setPage(1); };
  const filtersActive = !!(q || category || location);

  const enrol = async (e: EventItem) => {
    const ok = await run(`enrol-${e.id}`, () => api.post(`/events/${e.id}/enroll`, {}), `You are enrolled in “${e.title}”.`);
    if (ok !== undefined) await browse.reload();
  };
  const leave = async () => {
    if (!withdraw) return;
    const ok = await run(`leave-${withdraw.id}`, () => api.del(`/events/${withdraw.id}/enroll`), 'You have withdrawn from the event.');
    setWithdraw(null);
    if (ok !== undefined) await browse.reload();
  };

  return (
    <>
      <PageHeader title="Events" description="Find events that need your skills, enrol in one click and track the ones you have joined." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Event view" value={view} onChange={reset} items={[{ value: 'browse', label: 'Browse events' }, { value: 'upcoming', label: 'My upcoming' }, { value: 'past', label: 'Past' }]} />
      </div>

      {view === 'browse' && (
        <div className="mb-6 grid gap-3 rounded-card border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <SearchInput aria-label="Search events" placeholder="Search by title or keyword" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <Select aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {meta.data?.eventCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input aria-label="Location" placeholder="City or venue" value={location} onChange={(e) => { setLocation(e.target.value); setPage(1); }} />
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as 'date' | 'newest')}>
            <option value="date">Soonest first</option>
            <option value="newest">Recently added</option>
          </Select>
        </div>
      )}

      <QueryState state={browse} skeleton={<SkeletonCards count={6} />}>
        {(data) =>
          data.items.length === 0 ? (
            view === 'browse' ? (
              <EmptyState filtered={filtersActive} icon={<CalendarX className="size-6" />} title={filtersActive ? 'No events match your filters' : 'No open events right now'} description={filtersActive ? 'Try a different keyword, category or city.' : 'New events are published regularly. Check back soon.'} action={filtersActive ? <Button variant="outline" onClick={() => { setQ(''); setCategory(''); setLocation(''); }}><SlidersHorizontal className="size-4" /> Clear filters</Button> : undefined} />
            ) : (
              <EmptyState icon={<CalendarX className="size-6" />} title={view === 'upcoming' ? 'You have not enrolled in any upcoming events' : 'No past events yet'} description="Browse open events and enrol to see them here." action={<Button onClick={() => reset('browse')}>Browse events</Button>} />
            )
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2 xl:grid-cols-3">
                {data.items.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    href={`/talent/events/${e.id}`}
                    actions={
                      <>
                        <ButtonLink href={`/talent/events/${e.id}`} variant="outline" size="sm">View details</ButtonLink>
                        {e.enrolled && e.status === 'PUBLISHED' ? (
                          <Button size="sm" variant="ghost" loading={busy === `leave-${e.id}`} onClick={() => setWithdraw(e)}>Withdraw</Button>
                        ) : !e.enrolled && e.status === 'PUBLISHED' ? (
                          <Button size="sm" loading={busy === `enrol-${e.id}`} onClick={() => void enrol(e)}>Enrol</Button>
                        ) : null}
                      </>
                    }
                  />
                ))}
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
            </>
          )
        }
      </QueryState>

      <ConfirmDialog open={!!withdraw} onClose={() => setWithdraw(null)} onConfirm={leave} title="Withdraw from this event?" description={withdraw ? `You will be removed from “${withdraw.title}”. You can enrol again later while it is still open.` : ''} confirmLabel="Withdraw" />
    </>
  );
}
