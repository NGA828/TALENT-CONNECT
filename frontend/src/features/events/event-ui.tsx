import Link from 'next/link';
import { BadgeCheck, CalendarDays, MapPin, Users, Wallet } from 'lucide-react';
import type { EventItem } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge, StatusBadge } from '@/components/ui/badge';

export function DateBlock({ iso, className }: { iso: string; className?: string }) {
  const d = new Date(iso);
  return (
    <div className={cn('flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-accent-50 text-accent-700', className)}>
      <span className="text-[11px] font-bold uppercase tracking-wide">{d.toLocaleString('en-GB', { month: 'short' })}</span>
      <span className="font-display text-2xl font-extrabold leading-none">{d.getDate()}</span>
    </div>
  );
}

export function EventMeta({ event, className }: { event: Pick<EventItem, 'eventDate' | 'location' | 'budget' | 'enrollmentCount'>; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600', className)}>
      <li className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-slate-400" aria-hidden />{formatDate(event.eventDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</li>
      <li className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-slate-400" aria-hidden />{event.location}</li>
      {event.budget && <li className="inline-flex items-center gap-1.5"><Wallet className="size-4 text-slate-400" aria-hidden />{event.budget}</li>}
      <li className="inline-flex items-center gap-1.5"><Users className="size-4 text-slate-400" aria-hidden />{event.enrollmentCount} enrolled</li>
    </ul>
  );
}

export function AgencyLabel({ promoter }: { promoter: EventItem['promoter'] }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
      {promoter.verified && <BadgeCheck className="size-4 text-emerald-600" aria-label="Verified agency" />}
      {promoter.agencyName}
    </span>
  );
}

/** Card used by the talent event browser. Actions are passed in so the parent owns the API calls. */
export function EventCard({ event, href, actions }: { event: EventItem; href: string; actions?: React.ReactNode }) {
  return (
    <article className="flex flex-col rounded-card border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <DateBlock iso={event.eventDate} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {event.category && <Badge tone="violet">{event.category}</Badge>}
            {event.status !== 'PUBLISHED' && <StatusBadge status={event.status} />}
            {event.enrolled && <Badge tone="green" dot>Enrolled</Badge>}
          </div>
          <h3 className="mt-1.5 font-display text-lg font-bold leading-snug text-slate-900">
            <Link href={href} className="hover:text-accent-700 hover:underline">{event.title}</Link>
          </h3>
          <AgencyLabel promoter={event.promoter} />
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{event.description}</p>
      <EventMeta event={event} className="mt-4" />
      {event.talentNeeded && <p className="mt-3 text-sm text-slate-500">Looking for: <span className="font-medium text-slate-800">{event.talentNeeded}</span></p>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">{actions}</div>
    </article>
  );
}
