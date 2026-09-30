'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BadgeCheck, Banknote, Save, Search, Smartphone, XCircle } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useDebounce } from '@/lib/hooks';
import { formatCameroonPhone, formatDateTime, formatMoney } from '@/lib/format';
import { useToast } from '@/lib/toast';
import type { AdminLicenceFee, Payment, Paginated, PaymentMethod, PaymentStatus, FeePromoter } from '@/lib/types';
import { Card, CardHeader, PageHeader, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/form';
import { Alert, EmptyState, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { PaymentStatusBadge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/modal';
import { ReasonModal } from './reason-modal';

const METHOD_LABEL: Record<string, string> = { MTN_MOMO: 'MTN MoMo', ORANGE_MONEY: 'Orange Money', OFFLINE: 'Counter payment' };
type Tray = 'awaiting' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'ALL';

export function AdminLicenceFeesPage() {
  const state = useApi<AdminLicenceFee>('/admin/licence-fee');
  return (
    <>
      <PageHeader title="Licence fees" description="You own the licence fee: set the amount in FCFA, the MTN MoMo / Orange Money wallets that collect it, and confirm every transfer." />
      <QueryState state={state} skeleton={<SkeletonRows rows={5} />}>{(d) => <Content d={d} reload={state.reload} />}</QueryState>
    </>
  );
}

function Content({ d, reload }: { d: AdminLicenceFee; reload: () => unknown }) {
  const [tray, setTray] = useState<Tray>('awaiting');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Payment | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const toast = useToast();
  const dq = useDebounce(q);
  const list = useApi<Paginated<Payment>>('/admin/payments', {
    status: tray === 'awaiting' || tray === 'ALL' ? undefined : (tray as PaymentStatus),
    awaiting: tray === 'awaiting' ? true : undefined,
    q: dq || undefined,
    page,
    pageSize: 10,
  });

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      setTarget(null);
      setConfirming(false);
      setRejecting(false);
      setRefunding(false);
      setNote('');
      await Promise.all([reload(), list.reload()]);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!target) return;
    await run(() => api.post(`/admin/payments/${target.id}/confirm`, { note: note || undefined }), 'Transfer confirmed and the licence fee marked as paid.');
  };
  const reject = async (reason: string) => {
    if (!target) return;
    await run(() => api.post(`/admin/payments/${target.id}/reject`, { reason }), 'Transfer rejected; the promoter has been notified.');
  };
  const refund = async (reason: string) => {
    if (!target) return;
    await run(() => api.post(`/admin/payments/${target.id}/refund`, { note: reason || undefined }), 'Refund recorded — send the money back from the merchant wallet.');
  };

  const { settings, overview } = d;

  return (
    <div className="space-y-6">
      {d.demoWalletsInUse.length > 0 && (
        <Alert tone="warning" title="Demo wallets still in use">
          The {d.demoWalletsInUse.join(' and ')} numbers below are the ones shipped with the demo. Replace them with the platform&apos;s real merchant wallets before collecting any money.
        </Alert>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Licence fee" value={formatMoney(overview.licenceFee, overview.currency)} hint={settings.payeeName} />
        <StatCard label="Collected" value={formatMoney(overview.collected, overview.currency)} hint={`${overview.counts.confirmed} confirmed transfer${overview.counts.confirmed === 1 ? '' : 's'}`} />
        <StatCard label="To confirm" value={String(overview.counts.awaiting)} hint={`${formatMoney(overview.awaitingAmount, overview.currency)} declared`} />
        <StatCard label="Fee unpaid" value={String(overview.promoters.feeUnpaid)} hint={`${overview.promoters.total} promoters in total`} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <CardHeader title="Mobile Money transfers" description="Declared by promoters, confirmed by you against the merchant wallet." />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <Tabs label="Fee transfers" value={tray} onChange={(v) => { setTray(v); setPage(1); }} items={[{ value: 'awaiting', label: `To confirm${overview.counts.awaiting ? ` (${overview.counts.awaiting})` : ''}` }, { value: 'SUCCESS', label: 'Confirmed' }, { value: 'FAILED', label: 'Rejected' }, { value: 'REFUNDED', label: 'Refunded' }, { value: 'ALL', label: 'All' }]} />
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input aria-label="Search transfers" className="pl-9" placeholder="Agency, payer, transaction ID" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>
          </div>
          <QueryState state={list} skeleton={<SkeletonRows rows={4} />}>
            {(items) =>
              items.items.length === 0 ? (
                <EmptyState filtered={tray !== 'awaiting' || !!q} icon={<Smartphone className="size-6" />} title={tray === 'awaiting' && !q ? 'No transfer to confirm' : 'No transfers match'} description={tray === 'awaiting' && !q ? 'Promoters who declare a Mobile Money transfer appear here.' : 'Try another status, network or search term.'} />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Promoter</th>
                          <th className="px-4 py-3 font-semibold">Transfer</th>
                          <th className="px-4 py-3 font-semibold">Payer</th>
                          <th className="px-4 py-3 text-right font-semibold">Amount</th>
                          <th className="px-4 py-3 font-semibold">Submitted</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.items.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <Link href={`/admin/promoters/${p.promoter?.id}`} className="font-medium text-slate-900 hover:text-accent-700">{p.promoter?.agencyName ?? '—'}</Link>
                              {p.promoter?.user && <p className="text-xs text-slate-500">{p.promoter.user.firstName} {p.promoter.user.lastName} · {p.promoter.user.email}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-slate-800">{p.method ? METHOD_LABEL[p.method] ?? p.method : '—'}</p>
                              {p.transactionRef && <p className="font-mono text-xs text-slate-500">{p.transactionRef}</p>}
                              <p className="font-mono text-[11px] text-slate-400">{p.providerRef ?? p.id}</p>
                              {p.receiptUrl && <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-accent-700 hover:underline">Receipt</a>}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <p>{p.payerName ?? '—'}</p>
                              {p.payerPhone && <p className="text-xs text-slate-500">{formatCameroonPhone(p.payerPhone)}</p>}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatMoney(p.amount, p.currency)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{p.submittedAt ? formatDateTime(p.submittedAt) : '—'}</td>
                            <td className="px-4 py-3">
                              <PaymentStatusBadge status={p.status} submitted={!!p.submittedAt} />
                              {p.reviewNote && <p className="mt-1 max-w-[220px] text-xs text-slate-500">{p.reviewNote}</p>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {p.status === 'PENDING' && p.submittedAt && (
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => { setTarget(p); setRejecting(true); }}><XCircle className="size-3.5" /> Reject</Button>
                                  <Button size="sm" onClick={() => { setTarget(p); setNote(''); setConfirming(true); }}><BadgeCheck className="size-3.5" /> Confirm</Button>
                                </div>
                              )}
                              {p.status === 'SUCCESS' && (
                                <Button size="sm" variant="outline" onClick={() => { setTarget(p); setRefunding(true); }}><Banknote className="size-3.5" /> Refund</Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={items.page} totalPages={items.totalPages} total={items.total} pageSize={items.pageSize} onChange={setPage} />
                </>
              )
            }
          </QueryState>
        </Card>

        <aside className="space-y-6">
          <FeeSettings d={d} reload={reload} />
          <RecordPayment promoters={d.promoters} currency={settings.currency} defaultAmount={settings.amount} onDone={reload} />
        </aside>
      </div>

      <ConfirmDialog open={confirming} onClose={() => setConfirming(false)} onConfirm={confirm} tone="primary" confirmLabel="Confirm transfer"
        title="Confirm this Mobile Money transfer?" description={target ? `${target.payerName ?? 'The promoter'} sent ${formatMoney(target.amount, target.currency)} with ${target.method ? METHOD_LABEL[target.method] : 'Mobile Money'} (${target.transactionRef ?? 'no transaction ID'}). Confirm it only after you see it on the merchant wallet — the fee is then marked as paid.` : ''} />
      <ReasonModal open={rejecting} onClose={() => setRejecting(false)} busy={busy} tone="danger" required label="Why is the transfer rejected?" title="Reject this transfer" description="The promoter is notified and can correct the transaction ID and submit again." confirmLabel="Reject transfer" onSubmit={reject} />
      <ReasonModal open={refunding} onClose={() => setRefunding(false)} busy={busy} label="Refund note" title="Refund this licence fee" description="Send the money back from the MTN MoMo / Orange Money merchant wallet, then record it here. The fee becomes outstanding again." confirmLabel="Record refund" onSubmit={refund} />
    </div>
  );
}

function FeeSettings({ d, reload }: { d: AdminLicenceFee; reload: () => unknown }) {
  const toast = useToast();
  const { limits } = d;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: String(d.settings.amount),
    payeeName: d.settings.payeeName,
    mtnNumber: d.settings.mtnNumber,
    orangeNumber: d.settings.orangeNumber,
    mtnEnabled: d.settings.mtnEnabled,
    orangeEnabled: d.settings.orangeEnabled,
    instructions: d.settings.instructions,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.patch('/admin/licence-fee', {
        amount: Number(form.amount),
        payeeName: form.payeeName,
        mtnNumber: form.mtnNumber || undefined,
        orangeNumber: form.orangeNumber || undefined,
        mtnEnabled: form.mtnEnabled,
        orangeEnabled: form.orangeEnabled,
        instructions: form.instructions,
      });
      toast.success('Licence fee settings saved.');
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Fee settings" description={`${limits.minFee.toLocaleString('en-CM')} – ${limits.maxFee.toLocaleString('en-CM')} FCFA, whole francs.`} />
      <div className="space-y-4 p-5">
        {error && <Alert tone="danger">{error}</Alert>}
        <Input label="Licence fee (FCFA)" type="number" min={limits.minFee} max={limits.maxFee} step={500} value={form.amount} onChange={(e) => set('amount', e.target.value)} hint="Charged once per promoter, in whole CFA francs." />
        <Input label="Account holder" value={form.payeeName} maxLength={120} onChange={(e) => set('payeeName', e.target.value)} hint="Name promoters see when they send the money." />
        <Input label="MTN MoMo merchant number" placeholder="+237 6 77 12 34 56" value={form.mtnNumber} onChange={(e) => set('mtnNumber', e.target.value)} hint="Wallet that receives the fee (*126#)." />
        <Checkbox label="Accept MTN MoMo" checked={form.mtnEnabled} onChange={(e) => set('mtnEnabled', e.target.checked)} />
        <Input label="Orange Money merchant number" placeholder="+237 6 99 12 34 56" value={form.orangeNumber} onChange={(e) => set('orangeNumber', e.target.value)} hint="Wallet that receives the fee (#150#)." />
        <Checkbox label="Accept Orange Money" checked={form.orangeEnabled} onChange={(e) => set('orangeEnabled', e.target.checked)} />
        <Textarea label="Instructions shown to promoters" rows={3} maxLength={500} value={form.instructions} onChange={(e) => set('instructions', e.target.value)} />
        <Button className="w-full" loading={busy} onClick={save}><Save className="size-4" /> Save licence fee settings</Button>
        <p className="text-xs text-slate-500">A licence can only be approved once the fee is confirmed{ d.settings.updatedAt ? ` · last change ${formatDateTime(d.settings.updatedAt)}` : '' }.</p>
      </div>
    </Card>
  );
}

function RecordPayment({ promoters, currency, defaultAmount, onDone }: { promoters: FeePromoter[]; currency: string; defaultAmount: number; onDone: () => unknown }) {
  const toast = useToast();
  const [promoterId, setPromoterId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('OFFLINE');
  const [amount, setAmount] = useState(String(defaultAmount));
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!promoterId) return toast.error('Choose the promoter who paid.');
    setBusy(true);
    try {
      await api.post('/admin/payments/manual', {
        promoterId,
        method,
        amount: Number(amount),
        payerName: payerName || undefined,
        payerPhone: method === 'OFFLINE' ? undefined : payerPhone || undefined,
        transactionRef: transactionRef || undefined,
        note: note || undefined,
      });
      toast.success('Payment recorded and the fee marked as paid.');
      setPromoterId('');
      setPayerName('');
      setPayerPhone('');
      setTransactionRef('');
      setNote('');
      await onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Record a payment" description="Cash at the office or a transfer you already saw on the merchant wallet." />
      <div className="space-y-4 p-5">
        {promoters.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-slate-500"><AlertTriangle className="size-4" /> Every promoter has settled the licence fee.</p>
        ) : (
          <>
            <Select label="Promoter" value={promoterId} onChange={(e) => setPromoterId(e.target.value)}>
              <option value="">Choose a promoter…</option>
              {promoters.map((p) => <option key={p.id} value={p.id}>{p.agencyName} — {p.user.firstName} {p.user.lastName}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                <option value="OFFLINE">Counter / cash</option>
                <option value="MTN_MOMO">MTN MoMo</option>
                <option value="ORANGE_MONEY">Orange Money</option>
              </Select>
              <Input label={`Amount (${currency})`} type="number" min={1000} step={500} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Input label="Payer name" value={payerName} maxLength={80} onChange={(e) => setPayerName(e.target.value)} />
            {method !== 'OFFLINE' && <Input label="Wallet number" placeholder="+237 6 77 12 34 56" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />}
            {method !== 'OFFLINE' && <Input label="Transaction ID" value={transactionRef} maxLength={40} onChange={(e) => setTransactionRef(e.target.value)} />}
            <Textarea label="Note" rows={2} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} hint="Kept on the payment record." />
            <Button className="w-full" variant="outline" loading={busy} onClick={submit}><Banknote className="size-4" /> Record payment</Button>
          </>
        )}
      </div>
    </Card>
  );
}
