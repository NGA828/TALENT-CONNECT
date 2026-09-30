'use client';

import { useState } from 'react';
import { CreditCard, ReceiptText } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { PaymentList } from '@/lib/types';
import { Card, PageHeader, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, EmptyState, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { StatusBadge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { SandboxBanner } from './sandbox-banner';
import { PayLicenceModal } from './pay-licence-modal';

export function PaymentsPage() {
  const [status, setStatus] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED'>('ALL');
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState(false);
  const state = useApi<PaymentList>('/payments', { status: status === 'ALL' ? undefined : status, page, pageSize: 10 });

  return (
    <>
      <PageHeader title="Payments" description="Your licence-fee payments and receipts." actions={state.data && !state.data.licence.licenceFeePaid ? <Button onClick={() => setPaying(true)}><CreditCard className="size-4" /> Pay licence fee</Button> : undefined} />
      <QueryState state={state} skeleton={<SkeletonRows rows={4} />}>
        {(d) => (
          <div className="space-y-5">
            <SandboxBanner config={d.config} />
            {!d.licence.licenceFeePaid && <Alert tone="warning" title="Licence fee outstanding">Pay the one-time fee of {formatMoney(d.config.licenceFee, d.config.currency)} to submit your licence for verification.</Alert>}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
              <StatCard label="Total paid" value={formatMoney(d.totalPaid, d.config.currency)} />
              <StatCard label="Licence fee" value={formatMoney(d.config.licenceFee, d.config.currency)} hint={d.licence.licenceFeePaid ? 'Paid' : 'Not yet paid'} />
              <StatCard label="Licence status" value={<StatusBadge status={d.licence.licenceStatus} />} />
            </div>
            <Tabs label="Payment status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} items={[{ value: 'ALL', label: 'All' }, { value: 'SUCCESS', label: 'Successful' }, { value: 'FAILED', label: 'Failed' }, { value: 'PENDING', label: 'Pending' }, { value: 'REFUNDED', label: 'Refunded' }]} />
            {d.items.length === 0 ? (
              <EmptyState filtered={status !== 'ALL'} icon={<ReceiptText className="size-6" />} title={status === 'ALL' ? 'No payments yet' : 'No payments with this status'} description="Payments you make on Talent Connect will be listed here." />
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Description</th><th className="px-5 py-3 font-semibold">Date</th><th className="px-5 py-3 font-semibold">Card</th><th className="px-5 py-3 text-right font-semibold">Amount</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {d.items.map((p) => (
                        <tr key={p.id}>
                          <td className="px-5 py-3.5"><p className="font-medium text-slate-900">{p.description ?? 'Licence fee'}</p>{p.failureReason && <p className="text-xs text-red-600">{p.failureReason}</p>}<p className="font-mono text-[11px] text-slate-400">{p.providerRef ?? p.id}</p></td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{formatDateTime(p.createdAt)}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{p.cardLast4 ? `${p.cardBrand ?? 'Card'} •••• ${p.cardLast4}` : '—'}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium tabular-nums">{formatMoney(p.amount, p.currency)}</td>
                          <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            <Pagination page={d.page} totalPages={d.totalPages} total={d.total} pageSize={d.pageSize} onChange={setPage} />
          </div>
        )}
      </QueryState>
      <PayLicenceModal open={paying} onClose={() => setPaying(false)} onFinished={() => void state.reload()} />
    </>
  );
}
