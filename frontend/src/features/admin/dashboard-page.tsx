'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate, formatMoney, humanize, timeAgo } from '@/lib/format';
import type { AdminStats } from '@/lib/types';
import { Card, CardHeader, PageHeader } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { QueryState, SkeletonRows } from '@/components/ui/feedback';

function Table({ title, data, unit }: { title: string; data: [string, number][]; unit?: (k: string) => string }) {
  return (
    <Card>
      <CardHeader title={title} />
      <table className="w-full text-sm"><tbody className="divide-y divide-slate-100">
        {data.length === 0 ? <tr><td className="px-5 py-4 text-slate-500">No data yet.</td></tr> : data.map(([k, v]) => <tr key={k}><td className="px-5 py-2 text-slate-600">{humanize(k)}</td><td className="px-5 py-2 text-right font-semibold tabular-nums text-slate-900">{unit ? unit(k) : v}</td></tr>)}
      </tbody></table>
    </Card>
  );
}

export function AdminDashboardPage() {
  const state = useApi<AdminStats>('/admin/stats', undefined, { pollMs: 60000 });
  return (
    <>
      <PageHeader title="Overview" eyebrow="Admin console" description="What needs a decision, and how the platform is doing." />
      <QueryState state={state} skeleton={<SkeletonRows rows={6} />}>
        {(s) => {
          const attention = s.pendingVerification + s.portfolios.flagged;
          const metrics: [string, string | number, string][] = [
            ['Users', s.users.total, `${s.users.new7d} new this week`],
            ['Talents', s.users.talents, `${s.users.active7d} active in 7 days`],
            ['Promoters', s.users.promoters, `${s.pendingVerification} awaiting review`],
            ['Events', s.events.total, `${s.events.byStatus.PUBLISHED ?? 0} published`],
            ['Contracts', s.contracts.total, `${s.contracts.active} active`],
            ['Revenue', formatMoney(s.payments.revenue), `${s.payments.byStatus.SUCCESS?.count ?? 0} successful payments`],
          ];
          return (
            <div className="space-y-5">
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-card border px-5 py-4 ${attention ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><AlertTriangle className={`size-4 ${attention ? 'text-amber-600' : 'text-emerald-600'}`} />
                  {attention ? `${s.pendingVerification} licence${s.pendingVerification === 1 ? '' : 's'} to verify · ${s.portfolios.flagged} flagged portfolio item${s.portfolios.flagged === 1 ? '' : 's'}` : 'Nothing is waiting for review.'}
                </p>
                <div className="flex gap-2">{s.pendingVerification > 0 && <ButtonLink size="sm" href="/admin/promoters">Open verification queue</ButtonLink>}{s.portfolios.flagged > 0 && <ButtonLink size="sm" variant="outline" href="/admin/portfolios">Review flagged items</ButtonLink>}</div>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-slate-200 bg-slate-200 md:grid-cols-3 xl:grid-cols-6">
                {metrics.map(([l, v, sub]) => <div key={l} className="bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{l}</p><p className="mt-1 font-display text-2xl font-extrabold text-slate-900">{v}</p><p className="truncate text-xs text-slate-500">{sub}</p></div>)}
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader title="Verification queue" description="Oldest submissions first" action={<Link href="/admin/promoters" className="text-sm font-medium text-accent-700 hover:underline">All promoters</Link>} />
                  {s.pendingPromoters.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No licences are waiting for review.</p> : (
                    <div className="overflow-x-auto"><table className="w-full min-w-[460px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-2 font-semibold">Agency</th><th className="px-5 py-2 font-semibold">Owner</th><th className="px-5 py-2 font-semibold">Submitted</th><th className="px-5 py-2" /></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {s.pendingPromoters.map((p) => <tr key={p.id} className="hover:bg-slate-50"><td className="px-5 py-2.5 font-medium text-slate-900">{p.agencyName}</td><td className="px-5 py-2.5 text-slate-600">{p.owner}</td><td className="px-5 py-2.5 text-slate-600">{formatDate(p.submittedAt)}</td><td className="px-5 py-2.5 text-right"><ButtonLink size="sm" href={`/admin/promoters/${p.id}`}>Review</ButtonLink></td></tr>)}
                      </tbody>
                    </table></div>
                  )}
                </Card>
                <Card>
                  <CardHeader title="Newest accounts" action={<Link href="/admin/users" className="text-sm font-medium text-accent-700 hover:underline">All users</Link>} />
                  <ul className="divide-y divide-slate-100">
                    {s.recentUsers.map((u) => <li key={u.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm"><span className="min-w-0"><span className="block truncate font-medium text-slate-900">{u.firstName} {u.lastName}</span><span className="text-xs text-slate-500">{humanize(u.role)} · {timeAgo(u.createdAt)}</span></span>{u.status !== 'ACTIVE' ? <StatusBadge status={u.status} /> : <Badge tone="slate">{humanize(u.role)}</Badge>}</li>)}
                  </ul>
                </Card>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2 xl:grid-cols-4">
                <Table title="Events by status" data={Object.entries(s.events.byStatus) as [string, number][]} />
                <Table title="Contracts by status" data={Object.entries(s.contracts.byStatus) as [string, number][]} />
                <Table title="Payments by status" data={Object.entries(s.payments.byStatus).map(([k, v]) => [k, v!.count] as [string, number])} />
                <Table title="Accounts by status" data={Object.entries(s.users.byStatus)} />
              </div>
            </div>
          );
        }}
      </QueryState>
    </>
  );
}
