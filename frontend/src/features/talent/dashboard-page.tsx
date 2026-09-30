'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, FileSignature, Images, MapPin, Sparkles, Star, UserRound } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate, timeAgo } from '@/lib/format';
import type { TalentDashboard } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { QueryState, SkeletonRows } from '@/components/ui/feedback';
import { StatusBadge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/rating';
import { WorkspaceBand } from '@/components/layout/workspace-band';
import { RecentNotifications } from '@/features/notifications/recent-notifications';
import { useAuth } from '@/features/auth/auth-context';
import { DateBlock } from '@/features/events/event-ui';
import { CompletionRing } from './completion-ring';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function TalentDashboardPage() {
  const { user } = useAuth();
  const state = useApi<TalentDashboard>('/talents/me/dashboard', undefined, { pollMs: 60000 });
  return (
    <QueryState state={state} skeleton={<SkeletonRows rows={6} />}>
      {(d) => {
        const nextSteps = d.completion.items.filter((i) => !i.done);
        return (
          <div className="space-y-6">
            <WorkspaceBand label="Talent workspace">
              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar firstName={user?.firstName} lastName={user?.lastName} src={d.profile.avatarUrl} size={64} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-600">{greeting()}</p>
                  <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">{d.profile.firstName}, here is your week</h1>
                  <p className="mt-1 text-sm text-slate-600">
                    {d.pendingContracts.length > 0 ? `${d.pendingContracts.length} contract${d.pendingContracts.length > 1 ? 's' : ''} waiting for your answer.` : d.upcomingEventsCount > 0 ? `You are booked for ${d.upcomingEventsCount} upcoming event${d.upcomingEventsCount > 1 ? 's' : ''}.` : 'No pending actions. Browse events to find your next booking.'}
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-3">
                  <CompletionRing percent={d.completion.percent} size={56} />
                  <div className="text-sm"><p className="font-semibold text-slate-900">Profile strength</p>
                    {nextSteps[0] ? <Link href="/talent/profile" className="text-accent-700 hover:underline">Next: {nextSteps[0].label.toLowerCase()}</Link> : <span className="text-slate-600">Complete</span>}
                  </div>
                </div>
              </div>
            </WorkspaceBand>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-6">
                <Card>
                  <CardHeader title="Needs your response" description="Contracts sent to you by promoters" action={<Link href="/talent/contracts" className="text-sm font-medium text-accent-700 hover:underline">All contracts</Link>} />
                  {d.pendingContracts.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-500">Nothing is waiting for you right now.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {d.pendingContracts.map((c) => (
                        <li key={c.id}>
                          <Link href={`/talent/contracts/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                            <span className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><FileSignature className="size-5" /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-slate-900">{c.eventTitle}</span>
                              <span className="block truncate text-sm text-slate-500">{c.agencyName} · sent {timeAgo(c.createdAt)}</span>
                            </span>
                            <span className="hidden text-sm text-slate-500 sm:block">Event {formatDate(c.eventDate)}</span>
                            <ArrowRight className="size-4 text-slate-400" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Your upcoming events" action={<Link href="/talent/events" className="text-sm font-medium text-accent-700 hover:underline">Browse events</Link>} />
                  {d.upcomingEvents.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <CalendarDays className="mx-auto size-8 text-slate-300" />
                      <p className="mt-2 text-sm text-slate-500">You have not enrolled in any upcoming events.</p>
                      <ButtonLink href="/talent/events" size="sm" className="mt-3">Find events</ButtonLink>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {d.upcomingEvents.map((e) => (
                        <li key={e.id}>
                          <Link href={`/talent/events/${e.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                            <DateBlock iso={e.eventDate} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-slate-900">{e.title}</span>
                              <span className="flex items-center gap-1 truncate text-sm text-slate-500"><MapPin className="size-3.5 shrink-0" />{e.location} · {e.agencyName}</span>
                            </span>
                            <StatusBadge status={e.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <Star className="size-5 text-amber-500" />
                    <p className="mt-2 font-display text-2xl font-extrabold text-slate-900">{d.rating.count ? d.rating.average.toFixed(1) : '—'}</p>
                    {d.rating.count > 0 ? <StarRating value={d.rating.average} size={12} /> : null}
                    <Link href="/talent/ratings" className="mt-1 block text-xs text-slate-500 hover:underline">{d.rating.count} review{d.rating.count === 1 ? '' : 's'}</Link>
                  </Card>
                  <Card className="p-4">
                    <Images className="size-5 text-accent-600" />
                    <p className="mt-2 font-display text-2xl font-extrabold text-slate-900">{d.portfolio.total}</p>
                    <Link href="/talent/portfolio" className="text-xs text-slate-500 hover:underline">{d.portfolio.published} published</Link>
                  </Card>
                </div>
                <Card>
                  <CardHeader title="Contracts" />
                  <dl className="grid grid-cols-3 divide-x divide-slate-100 text-center">
                    {[['Pending', d.contracts.pending], ['Active', d.contracts.active], ['Completed', d.contracts.completed]].map(([l, n]) => (
                      <div key={l} className="py-4"><dd className="font-display text-xl font-extrabold text-slate-900">{n}</dd><dt className="text-xs text-slate-500">{l}</dt></div>
                    ))}
                  </dl>
                </Card>
                <Card>
                  <CardHeader title="Recent notifications" description={d.unreadNotifications ? `${d.unreadNotifications} unread` : undefined} />
                  <RecentNotifications items={d.recentNotifications} allHref="/talent/notifications" />
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900"><Sparkles className="size-4 text-accent-600" /> Need a hand with your profile?</div>
                  <p className="mt-1 text-sm text-slate-600">Let the assistant polish your bio or draft a note to a promoter.</p>
                  <div className="mt-3 flex gap-2"><ButtonLink href="/talent/ai-assistant" variant="outline" size="sm">Open assistant</ButtonLink><ButtonLink href="/talent/profile" variant="ghost" size="sm"><UserRound className="size-4" /> Edit profile</ButtonLink></div>
                </Card>
              </div>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
