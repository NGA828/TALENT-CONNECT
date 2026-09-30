'use client';

import { useState } from 'react';
import { ReceiptText, Smartphone } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatCameroonPhone, formatDateTime, formatMoney } from '@/lib/format';
import type { PaymentList } from '@/lib/types';
import { Card, PageHeader, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, EmptyState, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { PaymentStatusBadge, StatusBadge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { MobileMoneyBanner } from './mobile-money-banner';
import { PayLicenceModal } from './pay-licence-modal';

const METHODS: Record<string, string> = { MTN_MOMO: 'MTN MoMo', ORANGE_MONEY: 'Orange Money', OFFLINE: 'Counter payment' };

export function PaymentsPage() {
  const [status, setStatus] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED'>('ALL');
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState(false);
  const state = useApi<PaymentList>('/payments', { status: status === 'ALL' ? undefined : status, page, pageSize: 10 });
  const awaiting = state.data?.awaitingConfirmation ?? 0;

  return (
    <>
      <PageHeader
        title="Licence fee"
        description="Pay the platform licence fee with MTN Mobile Money or Orange Money and follow the confirmation."
        actions={state.data && !state.data.licence.licenceFeePaid && awaiting === 0 ? <Button onClick={() => setPaying(true)}><Smartphone className="size-4" /> Pay the licence fee</Button> : undefined}
      />
      <QueryState state={state} skeleton={<SkeletonRows rows={4} />}>
        {(d) => (
          <div className="space-y-5">
            <MobileMoneyBanner config={d.config} />
            {awaiting > 0 && (
              <Alert tone="info" title="Transfer waiting for confirmation">
                An administrator confirms your {formatMoney(d.config.licenceFee, d.config.currency)} Mobile Money transfer before your licence goes for review. You will be notified as soon as it is checked.
              </Alert>
            )}
            {!d.licence.licenceFeePaid && awaiting === 0 && (
              <Alert tone="warning" title="Licence fee outstanding">
                Send {formatMoney(d.config.licenceFee, d.config.currency)} with MTN MoMo or Orange Money, then submit the transaction ID so an administrator can confirm it.
              </Alert>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total confirmed" value={formatMoney(d.totalPaid, d.config.currency)} />
              <StatCard label="Licence fee" value={formatMoney(d.config.licenceFee, d.config.currency)} hint={d.licence.licenceFeePaid ? 'Confirmed' : awaiting > 0 ? 'Awaiting confirmation' : 'Not paid yet'} />
              <StatCard label="Awaiting confirmation" value={String(awaiting)} hint={awaiting ? 'Administrator review' : 'Nothing pending'} />
              <StatCard label="Licence status" value={<StatusBadge status={d.licence.licenceStatus} />} />
            </div>
            <Tabs label="Payment status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} items={[{ value: 'ALL', label: 'All' }, { value: 'SUCCESS', label: 'Confirmed' }, { value: 'PENDING', label: 'Awaiting confirmation' }, { value: 'FAILED', label: 'Rejected' }, { value: 'REFUNDED', label: 'Refunded' }]} />
            {d.items.length === 0 ? (
              <EmptyState filtered={status !== 'ALL'} icon={<ReceiptText className="size-6" />} title={status === 'ALL' ? 'No licence-fee payments yet' : 'No payments with this status'} description="Mobile Money transfers you declare on Talent Connect are listed here." />
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Transfer</th>
                        <th className="px-5 py-3 font-semibold">Wallet</th>
                        <th className="px-5 py-3 font-semibold">Submitted</th>
                        <th className="px-5 py-3 text-right font-semibold">Amount</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {d.items.map((p) => (
                        <tr key={p.id}>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-900">{p.method ? METHODS[p.method] ?? p.method : p.description ?? 'Licence fee'}</p>
                            {p.transactionRef && <p className="font-mono text-xs text-slate-500">{p.transactionRef}</p>}
                            <p className="font-mono text-[11px] text-slate-400">{p.providerRef ?? p.id}</p>
                            {p.status === 'FAILED' && p.failureReason && <p className="mt-0.5 text-xs text-red-600">{p.failureReason}</p>}
                            {p.status === 'REFUNDED' && p.reviewNote && <p className="mt-0.5 text-xs text-slate-500">{p.reviewNote}</p>}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{p.payerPhone ? formatCameroonPhone(p.payerPhone) : '—'}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{p.submittedAt ? formatDateTime(p.submittedAt) : '—'}</td>
                          <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium tabular-nums">{formatMoney(p.amount, p.currency)}</td>
                          <td className="px-5 py-3.5">
                            <PaymentStatusBadge status={p.status} submitted={!!p.submittedAt} />
                            {p.receiptUrl && <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-medium text-accent-700 hover:underline">Receipt</a>}
                          </td>
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
