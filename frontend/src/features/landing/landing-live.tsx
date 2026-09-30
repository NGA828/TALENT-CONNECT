'use client';

import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, CalendarDays, MapPin, Quote, Star, Users } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate, formatNumber } from '@/lib/format';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { StarRating } from '@/components/ui/rating';
import { Badge } from '@/components/ui/badge';
import { EventThumb } from '@/features/events/event-ui';

interface Landing {
  stats: { talents: number; promoters: number; events: number; contracts: number };
  featuredTalents: { id: string; name: string; specialization: string; location: string | null; ratingAvg: number; ratingCount: number; skills: string[]; cover: string | null }[];
  upcomingEvents: { id: string; title: string; location: string; category: string | null; eventDate: string; agencyName: string; verified: boolean; enrollmentCount: number; coverImageUrl: string | null }[];
  testimonials: { id: string; score: number; comment: string; author: string; agencyName: string; about: string }[];
  showcase: { id: string; title: string; mediaUrl: string; by: string; specialization: string }[];
}

export function useLanding() {
  return useApi<Landing>('/public/landing');
}

export function LiveStats({ data }: { data?: Landing['stats'] }) {
  const items = [
    { label: 'Talents on the platform', value: data?.talents },
    { label: 'Licensed promoters', value: data?.promoters },
    { label: 'Events listed', value: data?.events },
    { label: 'Contracts issued', value: data?.contracts },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="flex flex-col-reverse justify-end">
          <dt className="text-sm text-slate-500">{s.label}</dt>
          <dd className="font-display text-3xl font-extrabold text-slate-900">{s.value === undefined ? <Skeleton className="h-8 w-14" /> : formatNumber(s.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FeaturedTalents({ data }: { data: Landing['featuredTalents'] }) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {data.slice(0, 6).map((t) => (
        <li key={t.id}>
          <Link href="/register" className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              {t.cover && <img src={t.cover} alt={`${t.name}, ${t.specialization}`} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />}
              <Badge tone="slate" className="absolute left-3 top-3 bg-white/95 backdrop-blur">{t.specialization}</Badge>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">{t.name}</h3>
                  {t.location && <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><MapPin className="size-3.5" />{t.location}</p>}
                </div>
                <ArrowUpRight className="size-5 text-slate-300 transition-colors group-hover:text-accent-600" aria-hidden />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.skills.slice(0, 3).map((s) => <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s}</span>)}
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3"><StarRating value={t.ratingAvg} showValue count={t.ratingCount} /></div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function UpcomingEvents({ data }: { data: Landing['upcomingEvents'] }) {
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {data.slice(0, 5).map((e) => {
        return (
          <li key={e.id}>
            <Link href="/register" className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 sm:gap-6 sm:px-6">
              <EventThumb event={e} className="h-16 w-24 sm:h-20 sm:w-28" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-base font-bold text-slate-900">{e.title}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{e.location}</span>
                  <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{formatDate(e.eventDate, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="flex items-center justify-end gap-1 text-sm font-medium text-slate-800">{e.verified && <BadgeCheck className="size-4 text-emerald-600" aria-label="Verified promoter" />}{e.agencyName}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-slate-500"><Users className="size-3.5" />{e.enrollmentCount} enrolled</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Testimonials({ data }: { data: Landing['testimonials'] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-3">
      {data.slice(0, 3).map((t) => (
        <figure key={t.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6">
          <Quote className="size-6 text-accent-300" aria-hidden />
          <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-200">“{t.comment}”</blockquote>
          <figcaption className="mt-5 border-t border-white/10 pt-4 text-sm">
            <span className="flex items-center gap-1 text-amber-400">{Array.from({ length: t.score }).map((_, i) => <Star key={i} className="size-3.5 fill-current" aria-hidden />)}</span>
            <span className="mt-2 block font-semibold text-white">{t.author}</span>
            <span className="block text-slate-400">{t.agencyName} · on {t.about}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function ShowcaseGrid({ data }: { data: Landing['showcase'] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {data.slice(0, 8).map((s) => (
        <li key={s.id} className="group relative overflow-hidden rounded-xl bg-slate-200">
          <img src={s.mediaUrl} alt={s.title} loading="lazy" className="aspect-[4/3] size-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-white">
            <p className="truncate text-sm font-semibold">{s.title}</p>
            <p className="truncate text-xs text-white/80">{s.by} · {s.specialization}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LiveSection({ state, children, skeletonClass = 'h-72' }: { state: ReturnType<typeof useLanding>; children: (d: Landing) => React.ReactNode; skeletonClass?: string }) {
  if (state.loading) return <Skeleton className={`${skeletonClass} w-full rounded-2xl`} />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={() => void state.reload()} />;
  return <>{children(state.data)}</>;
}
