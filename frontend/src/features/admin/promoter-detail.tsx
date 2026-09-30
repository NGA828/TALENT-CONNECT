'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ExternalLink, XCircle } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/lib/toast';
import { formatDate, formatDateTime, formatMoney, humanize } from '@/lib/format';
import type { AdminPromoterDetail } from '@/lib/types';
import { Card, CardHeader, DetailList } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, QueryState, Skeleton } from '@/components/ui/feedback';
import { StatusBadge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { ReasonModal } from './reason-modal';

export function AdminPromoterDetailPage({ id }: { id: string }) {
  const state = useApi<AdminPromoterDetail>(`/admin/promoters/${id}`);
  return (
    <>
      <Link href="/admin/promoters" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="size-4" /> All promoters</Link>
      <QueryState state={state} skeleton={<div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>}>{(p) => <Content p={p} reload={state.reload} />}</QueryState>
    </>
  );
}

function Content({ p, reload }: { p: AdminPromoterDetail; reload: () => Promise<void> | void }) {
  const toast = useToast();
  const [approve, setApprove] = useState(false);
  const [reject, setReject] = useState(false);
  const [busy, setBusy] = useState(false);
  const canDecide = p.licenceStatus === 'PENDING';
  const canApprove = p.licenceFeePaid;

  const decide = async (approved: boolean, reason?: string) => {
    setBusy(true);
    try {
      await api.patch(`/admin/promoters/${p.id}/verify`, { approved, reason: reason || undefined });
      toast.success(approved ? `${p.agencyName} is now verified.` : `${p.agencyName}'s licence was rejected.`);
      setApprove(false);
      setReject(false);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">{p.agencyName}</h1><StatusBadge status={p.licenceStatus} /></div>
          <p className="text-sm text-slate-600">{p.user.firstName} {p.user.lastName} · {p.user.email}{p.user.phone ? ` · ${p.user.phone}` : ''}</p>
        </div>
        {canDecide && (
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => setReject(true)}><XCircle className="size-4" /> Reject</Button>
            <Button onClick={() => setApprove(true)} disabled={!canApprove}><CheckCircle2 className="size-4" /> Approve licence</Button>
          </div>
        )}
      </div>

      {!p.licenceFeePaid && p.licenceStatus === 'PENDING' && <Alert tone="warning">The verification fee has not been paid, so this licence cannot be approved yet.</Alert>}
      {p.licenceStatus === 'REJECTED' && p.licenceRejectionReason && <Alert tone="danger" title="Rejection reason">{p.licenceRejectionReason}</Alert>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Licence submission" />
            <div className="p-5">
              <DetailList items={[
                { label: 'Licence number', value: p.licenceNumber ?? '—' },
                { label: 'Issuing authority', value: p.licenceAuthority ?? '—' },
                { label: 'Expiry date', value: p.licenceExpiry ? formatDate(p.licenceExpiry) : '—' },
                { label: 'Fee', value: p.licenceFeePaid ? 'Paid' : 'Unpaid' },
                { label: 'Submitted', value: p.licenceSubmittedAt ? formatDateTime(p.licenceSubmittedAt) : '—' },
                { label: 'Additional info', value: p.licenceInfo ?? '—' },
                { label: 'Document', value: p.licenceDocumentUrl ? <a href={p.licenceDocumentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-accent-700 hover:underline">Open document <ExternalLink className="size-3.5" /></a> : 'Not uploaded' },
              ]} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Agency" />
            <div className="p-5"><DetailList items={[{ label: 'About', value: p.agencyDescription ?? '—' }, { label: 'Location', value: p.location ?? '—' }, { label: 'Website', value: p.website ?? '—' }, { label: 'Account status', value: <StatusBadge status={p.user.status} /> }, { label: 'Joined', value: formatDate(p.user.createdAt) }, { label: 'Activity', value: `${p._count.events} events · ${p._count.contracts} contracts` }]} /></div>
          </Card>
          <Card>
            <CardHeader title="Events" />
            {p.events.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No events created.</p> : <ul className="divide-y divide-slate-100">{p.events.map((e) => <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span className="truncate font-medium text-slate-900">{e.title}</span><span className="flex items-center gap-3 text-slate-500">{formatDate(e.eventDate)}<StatusBadge status={e.status} /></span></li>)}</ul>}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Payments" />
            {p.payments.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No payments.</p> : <ul className="divide-y divide-slate-100">{p.payments.map((x) => <li key={x.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span><span className="block font-medium text-slate-900">{formatMoney(x.amount, x.currency)}</span><span className="text-xs text-slate-500">{formatDate(x.createdAt)}{x.cardLast4 ? ` · •••• ${x.cardLast4}` : ''}</span></span><StatusBadge status={x.status} /></li>)}</ul>}
          </Card>
          <Card>
            <CardHeader title="Review history" />
            {p.history.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No decisions yet.</p> : (
              <ol className="space-y-4 p-5">{p.history.map((h) => <li key={h.id} className="border-l-2 border-slate-200 pl-4"><p className="text-sm font-semibold text-slate-900">{humanize(h.action)}</p>{h.reason && <p className="text-sm text-slate-600">{h.reason}</p>}<p className="text-xs text-slate-400">{formatDateTime(h.createdAt)}{h.admin ? ` · ${h.admin}` : ''}</p></li>)}</ol>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog open={approve} onClose={() => setApprove(false)} onConfirm={() => decide(true)} tone="primary" confirmLabel="Approve and verify" title={`Verify ${p.agencyName}?`} description="The promoter will be able to publish events and issue contracts immediately." />
      <ReasonModal open={reject} onClose={() => setReject(false)} busy={busy} tone="danger" required label="Reason for rejection" title="Reject this licence" description="The promoter can fix the issue and resubmit without paying again." confirmLabel="Reject licence" onSubmit={(r) => decide(false, r)} />
    </div>
  );
}
