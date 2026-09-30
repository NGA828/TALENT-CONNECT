'use client';

import Link from 'next/link';
import { ArrowRight, CalendarPlus, ShieldAlert } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate, formatMoney, timeAgo } from '@/lib/format';
import type { EventStatus, PromoterDashboard } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Alert, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { StatusBadge } from '@/components/ui/badge';
import { WorkspaceBand } from '@/components/layout/workspace-band';
import { RecentNotifications } from '@/features/notifications/recent-notifications';
import { humanize } from '@/lib/format';
import { EventCover } from '@/features/events/event-images';

const pipeline: { status: EventStatus; bar: string }[] = [
  { status: 'DRAFT', bar: 'bg-slate-300' },
  { status: 'PUBLISHED', bar: 'bg-emerald-500' },
  { status: 'ONGOING', bar: 'bg-teal-500' },
  { status: 'COMPLETED', bar: 'bg-sky-500' },
  { status: 'CANCELLED', bar: 'bg-slate-400' },
];

export function PromoterDashboardPage() {
  const state = useApi<PromoterDashboard>('/promoters/me/dashboard', undefined, { pollMs: 60000 });
  return (
    <>
      <WorkspaceBand label="Promoter studio" title="Operations overview" description="Events, applicants and contracts across your agency." actions={<ButtonLink href="/promoter/events/create"><CalendarPlus className="size-4" /> New event</ButtonLink>} />
      <QueryState state={state} skeleton={<SkeletonRows rows={6} />}>
        {(d) => {
          const total = d.events.total || 1;
          const kpis = [
            { label: 'Open events', value: (d.events.byStatus.PUBLISHED ?? 0) + (d.events.byStatus.ONGOING ?? 0), sub: `${d.events.total} total`, href: '/promoter/events' },
            { label: 'Pending contracts', value: d.contracts.pending, sub: `${d.contracts.active} active`, href: '/promoter/contracts' },
            { label: 'Talent in your events', value: d.talentsInMyEvents, sub: `${d.talentsOnPlatform} on the platform`, href: '/promoter/talents' },
            { label: 'Fees paid', value: formatMoney(d.payments.totalPaid), sub: `${d.payments.count} payment${d.payments.count === 1 ? '' : 's'}`, href: '/promoter/payments' },
          ];
          return (
            <div className="space-y-6">
              {d.agency.licenceStatus !== 'VERIFIED' && (
                <Alert tone={d.agency.licenceStatus === 'REJECTED' ? 'danger' : 'warning'} title={d.agency.licenceStatus === 'PENDING' ? 'Licence under review' : d.agency.licenceStatus === 'REJECTED' ? 'Licence rejected' : 'Verification required'}>
                  <span className="flex flex-wrap items-center gap-2">
                    <ShieldAlert className="size-4" />
                    {d.agency.licenceStatus === 'PENDING' ? 'You can draft events, but publishing and contracts unlock after an admin verifies your licence.' : d.agency.licenceStatus === 'REJECTED' ? (d.agency.rejectionReason ?? 'Please update your licence details.') : d.agency.licenceFeePaid ? 'Submit your licence details to start the review.' : 'Submit your licence and pay the verification fee to publish events.'}
                    <Link href="/promoter/licence" className="font-semibold underline">Open licence</Link>
                  </span>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-slate-200 bg-slate-200 lg:grid-cols-4">
                {kpis.map((k) => (
                  <Link key={k.label} href={k.href} className="bg-white p-5 transition-colors hover:bg-slate-50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
                    <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900">{k.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{k.sub}</p>
                  </Link>
                ))}
              </div>

              <Card className="p-5">
                <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">Event pipeline</h2><Link href="/promoter/events" className="text-sm font-medium text-accent-700 hover:underline">Manage events</Link></div>
                {d.events.total === 0 ? <p className="mt-3 text-sm text-slate-500">You have not created any events yet.</p> : (
                  <>
                    <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Events by status">
                      {pipeline.map((p) => { const n = d.events.byStatus[p.status] ?? 0; return n ? <span key={p.status} className={p.bar} style={{ width: `${(n / total) * 100}%` }} title={`${humanize(p.status)}: ${n}`} /> : null; })}
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                      {pipeline.map((p) => <li key={p.status} className="flex items-center gap-2 text-slate-600"><span className={`size-2.5 rounded-full ${p.bar}`} />{humanize(p.status)} <strong className="text-slate-900">{d.events.byStatus[p.status] ?? 0}</strong></li>)}
                    </ul>
                  </>
                )}
              </Card>

              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader title="Upcoming events" />
                  {d.upcomingEvents.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No upcoming events. Create one to start receiving applicants.</p> : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-2.5 font-semibold">Event</th><th className="px-5 py-2.5 font-semibold">Date</th><th className="px-5 py-2.5 font-semibold">Status</th><th className="px-5 py-2.5 text-right font-semibold">Enrolled</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {d.upcomingEvents.map((e) => (
                            <tr key={e.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3"><div className="flex items-center gap-3"><EventCover event={{ title: e.title, category: null, coverImageUrl: e.coverImageUrl }} className="h-10 w-14 rounded-md" iconClassName="size-4" /><div className="min-w-0"><Link href={`/promoter/events/${e.id}`} className="font-medium text-slate-900 hover:text-accent-700">{e.title}</Link><p className="text-xs text-slate-500">{e.location}</p></div></div></td>
                              <td className="whitespace-nowrap px-5 py-3 text-slate-600">{formatDate(e.eventDate)}</td>
                              <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                              <td className="px-5 py-3 text-right font-semibold tabular-nums">{e.enrollmentCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Contracts awaiting talent" />
                  {d.pendingContracts.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No contracts are waiting for a response.</p> : (
                    <ul className="divide-y divide-slate-100">
                      {d.pendingContracts.map((c) => (
                        <li key={c.id}><Link href={`/promoter/contracts/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900">{c.talentName}</span><span className="block truncate text-xs text-slate-500">{c.eventTitle} · {timeAgo(c.createdAt)}</span></span><ArrowRight className="size-4 text-slate-400" /></Link></li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
                <Card>
                  <CardHeader title="Latest applicants" />
                  {d.recentEnrollments.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No talent has enrolled yet.</p> : (
                    <ul className="divide-y divide-slate-100">
                      {d.recentEnrollments.map((r) => (
                        <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                          <Avatar firstName={r.talent.name.split(' ')[0]} lastName={r.talent.name.split(' ')[1]} src={r.talent.avatarUrl} size={36} />
                          <div className="min-w-0 flex-1"><Link href={`/promoter/talents/${r.talent.id}`} className="block truncate text-sm font-medium text-slate-900 hover:text-accent-700">{r.talent.name}</Link><p className="truncate text-xs text-slate-500">{r.talent.specialization} · {r.event.title}</p></div>
                          <span className="text-xs text-slate-400">{timeAgo(r.enrolledAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card>
                  <CardHeader title="Recent notifications" description={d.unreadNotifications ? `${d.unreadNotifications} unread` : undefined} />
                  <RecentNotifications items={d.recentNotifications} allHref="/promoter/notifications" />
                </Card>
              </div>
            </div>
          );
        }}
      </QueryState>
    </>
  );
}
