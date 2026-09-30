'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import type { EventItem } from '@/lib/types';
import { PageHeader } from '@/components/ui/card';
import { QueryState, SkeletonRows } from '@/components/ui/feedback';
import { EventForm } from './event-form';

export function EditEvent({ id }: { id: string }) {
  const state = useApi<EventItem>(`/events/${id}`);
  return (
    <>
      <Link href={`/promoter/events/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="size-4" /> Back to event</Link>
      <PageHeader title="Edit event" description="Changes are visible to enrolled talent immediately." />
      <QueryState state={state} skeleton={<SkeletonRows rows={5} />}>{(e) => <EventForm existing={e} />}</QueryState>
    </>
  );
}
