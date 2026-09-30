'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { useDebounce } from '@/lib/hooks';
import { formatDate } from '@/lib/format';
import type { AdminPromoterRow, LicenceStatus, Paginated } from '@/lib/types';
import { Card, PageHeader } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { SearchInput } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';

type Filter = 'ALL' | LicenceStatus;

export function AdminPromotersPage() {
  const [status, setStatus] = useState<Filter>('PENDING');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const state = useApi<Paginated<AdminPromoterRow>>('/admin/promoters', { status: status === 'ALL' ? undefined : status, q: dq, page, pageSize: 12 });

  return (
    <>
      <PageHeader title="Promoter verification" description="Review licences before promoters can publish events or issue contracts. A licence can only be approved after the licence fee is confirmed in Licence fees." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Licence status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} items={[{ value: 'PENDING', label: 'Awaiting review' }, { value: 'VERIFIED', label: 'Verified' }, { value: 'REJECTED', label: 'Rejected' }, { value: 'NOT_SUBMITTED', label: 'Not submitted' }, { value: 'ALL', label: 'All' }]} />
        <SearchInput aria-label="Search promoters" className="w-full sm:w-72" placeholder="Search agency, owner or licence" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      <QueryState state={state} skeleton={<SkeletonRows rows={5} />}>
        {(d) =>
          d.items.length === 0 ? (
            <EmptyState filtered={status !== 'ALL' || !!q} icon={<ShieldCheck className="size-6" />} title={status === 'PENDING' && !q ? 'The review queue is empty' : 'No promoters match'} description={status === 'PENDING' && !q ? 'New licence submissions will appear here.' : 'Try another status or search term.'} />
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5 font-semibold">Agency</th><th className="px-4 py-2.5 font-semibold">Owner</th><th className="px-4 py-2.5 font-semibold">Licence</th><th className="px-4 py-2.5 font-semibold">Fee</th><th className="px-4 py-2.5 font-semibold">Submitted</th><th className="px-4 py-2.5 font-semibold">Status</th><th className="px-4 py-2.5" /></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {d.items.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3"><Link href={`/admin/promoters/${p.id}`} className="font-medium text-slate-900 hover:text-accent-700">{p.agencyName}</Link><p className="text-xs text-slate-500">{p.location ?? '—'} · {p._count.events} events</p></td>
                          <td className="px-4 py-3"><p className="text-slate-800">{p.user.firstName} {p.user.lastName}</p><p className="text-xs text-slate-500">{p.user.email}</p></td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.licenceNumber ?? '—'}</td>
                          <td className="px-4 py-3">{p.licenceFeePaid ? <span className="text-emerald-700">Paid</span> : <span className="text-amber-700">Unpaid</span>}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(p.licenceSubmittedAt)}</td>
                          <td className="px-4 py-3"><StatusBadge status={p.licenceStatus} /></td>
                          <td className="px-4 py-3 text-right"><ButtonLink size="sm" variant={p.licenceStatus === 'PENDING' ? 'primary' : 'outline'} href={`/admin/promoters/${p.id}`}>{p.licenceStatus === 'PENDING' ? 'Review' : 'Open'}</ButtonLink></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Pagination page={d.page} totalPages={d.totalPages} total={d.total} pageSize={d.pageSize} onChange={setPage} />
            </>
          )
        }
      </QueryState>
    </>
  );
}
