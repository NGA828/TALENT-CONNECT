'use client';

import { Activity, Database, HardDrive, Server } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDateTime, formatMoney, humanize, timeAgo } from '@/lib/format';
import type { AdminMonitoring } from '@/lib/types';
import { Card, CardHeader, PageHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QueryState, SkeletonRows } from '@/components/ui/feedback';

function uptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

function BarChart({ title, points, format = (n: number) => String(n), color }: { title: string; points: { label: string; value: number }[]; format?: (n: number) => string; color: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((a, p) => a + p.value, 0);
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between"><h3 className="text-sm font-semibold text-slate-900">{title}</h3><span className="text-xs text-slate-500">14-day total <strong className="text-slate-900">{format(total)}</strong></span></div>
      <div className="mt-4 flex h-28 items-end gap-1" role="img" aria-label={`${title}, last 14 days, total ${format(total)}`}>
        {points.map((p) => (
          <div key={p.label} className="group relative flex h-full flex-1 items-end" title={`${p.label}: ${format(p.value)}`}>
            <div className={`w-full rounded-t ${p.value ? color : 'bg-slate-200'}`} style={{ height: p.value ? `${Math.max(6, (p.value / max) * 100)}%` : '3px' }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-400"><span>{points[0]?.label}</span><span>{points[points.length - 1]?.label}</span></div>
    </Card>
  );
}

function Breakdown({ title, data, tones }: { title: string; data: Record<string, number>; tones: Record<string, string> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {Object.entries(data).map(([k, v]) => (
          <li key={k} className="text-sm">
            <div className="flex justify-between"><span className="text-slate-600">{humanize(k)}</span><span className="font-semibold tabular-nums text-slate-900">{v}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tones[k] ?? 'bg-slate-400'}`} style={{ width: `${(v / total) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function MonitoringPage() {
  const state = useApi<AdminMonitoring>('/admin/monitoring', undefined, { pollMs: 30000 });
  return (
    <>
      <PageHeader title="Monitoring" description="Platform health and the last 14 days of activity, read directly from the database. Refreshes every 30 seconds." />
      <QueryState state={state} skeleton={<SkeletonRows rows={6} />}>
        {(m) => {
          const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          const pts = (k: 'talents' | 'promoters' | 'contracts' | 'events' | 'revenue') => m.series.map((s) => ({ label: day(s.date), value: s[k] }));
          const signups = m.series.map((s) => ({ label: day(s.date), value: s.talents + s.promoters }));
          const sys = m.system;
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-slate-200 bg-slate-200 lg:grid-cols-4">
                {[
                  { icon: Server, label: 'API status', value: <Badge tone={sys.status === 'operational' ? 'green' : 'amber'} dot>{humanize(sys.status)}</Badge>, sub: `Up ${uptime(sys.uptimeSeconds)} · since ${formatDateTime(sys.startedAt)}` },
                  { icon: Database, label: 'Database', value: `${sys.dbLatencyMs} ms`, sub: 'Query round-trip' },
                  { icon: HardDrive, label: 'API memory', value: `${sys.memoryMb} MB`, sub: `Node ${sys.node} · ${sys.platform}` },
                  { icon: Activity, label: 'Records', value: (sys.records.users + sys.records.events + sys.records.contracts + sys.records.payments).toLocaleString(), sub: `${sys.records.users} users · ${sys.records.events} events · ${sys.records.contracts} contracts` },
                ].map((c) => (
                  <div key={c.label} className="bg-white p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><c.icon className="size-4" />{c.label}</p><div className="mt-2 font-display text-2xl font-extrabold text-slate-900">{c.value}</div><p className="mt-1 truncate text-xs text-slate-500">{c.sub}</p></div>
                ))}
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-4">
                <BarChart title="New sign-ups" points={signups} color="bg-indigo-500" />
                <BarChart title="Events created" points={pts('events')} color="bg-emerald-500" />
                <BarChart title="Contracts issued" points={pts('contracts')} color="bg-sky-500" />
                <BarChart title="Revenue" points={pts('revenue')} format={(n) => formatMoney(n)} color="bg-amber-500" />
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
                <Breakdown title="Licence pipeline" data={m.licencePipeline} tones={{ VERIFIED: 'bg-emerald-500', PENDING: 'bg-amber-500', REJECTED: 'bg-red-500', NOT_SUBMITTED: 'bg-slate-400' }} />
                <Breakdown title="Portfolio moderation" data={m.moderation} tones={{ ACTIVE: 'bg-emerald-500', FLAGGED: 'bg-amber-500', REMOVED: 'bg-red-500' }} />
                <Card className="lg:row-span-1">
                  <CardHeader title="Recent activity" />
                  {m.activity.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No activity yet.</p> : (
                    <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                      {m.activity.map((a, i) => <li key={i} className="flex items-start justify-between gap-3 px-5 py-2.5 text-sm"><span className="text-slate-700">{a.text}</span><span className="shrink-0 text-xs text-slate-400">{timeAgo(a.at)}</span></li>)}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
          );
        }}
      </QueryState>
    </>
  );
}
