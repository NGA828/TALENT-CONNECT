'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, CheckCircle2, Download, FileText, MapPin, MessageSquare, Pencil, Star, Upload, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useAction } from '@/lib/hooks';
import type { Contract } from '@/lib/types';
import { formatDate, formatDateTime, formatMoney, fullName } from '@/lib/format';
import { Card, CardHeader, DetailList } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, QueryState, Skeleton } from '@/components/ui/feedback';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/rating';
import { ConfirmDialog } from '@/components/ui/modal';
import { ContractTimeline } from './contract-ui';
import { ContractFormModal, RateTalentModal, RespondModal } from './contract-forms';

export function ContractDetail({ id, role }: { id: string; role: 'TALENT' | 'PROMOTER' }) {
  const state = useApi<Contract>(`/contracts/${id}`);
  const base = role === 'TALENT' ? '/talent' : '/promoter';
  return (
    <>
      <Link href={`${base}/contracts`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="size-4" /> All contracts</Link>
      <QueryState state={state} skeleton={<div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-96" /></div>}>
        {(c) => <Body contract={c} role={role} base={base} onChange={(next) => state.setData(() => next)} reload={state.reload} />}
      </QueryState>
    </>
  );
}

function Body({ contract: c, role, base, onChange, reload }: { contract: Contract; role: 'TALENT' | 'PROMOTER'; base: string; onChange: (c: Contract) => void; reload: () => Promise<void> }) {
  const { busy, run } = useAction();
  const fileRef = useRef<HTMLInputElement>(null);
  const [respond, setRespond] = useState<'ACCEPT' | 'REJECT' | null>(null);
  const [edit, setEdit] = useState(false);
  const [rate, setRate] = useState(false);
  const [confirm, setConfirm] = useState<'CANCELLED' | 'COMPLETED' | null>(null);

  const changeStatus = async (status: 'CANCELLED' | 'COMPLETED') => {
    const updated = await run('status', () => api.patch<Contract>(`/contracts/${c.id}/status`, { status }), status === 'COMPLETED' ? 'Contract marked as completed.' : 'Contract cancelled.');
    setConfirm(null);
    if (updated) onChange(updated);
  };

  const upload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const updated = await run('upload', () => api.upload<Contract>('POST', `/contracts/${c.id}/document`, form), 'Document attached.');
    if (updated) onChange(updated);
  };

  const other = role === 'TALENT' ? c.promoter.userId : c.talent.userId;
  const otherName = role === 'TALENT' ? c.promoter.agencyName : fullName(c.talent);
  const closed = c.status === 'CANCELLED' || c.status === 'REJECTED';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contract</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{c.event.title}</h1>
              <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-slate-400" />{formatDateTime(c.event.eventDate)}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-slate-400" />{c.event.location}</span>
              </p>
            </div>
            <StatusBadge status={c.status} className="text-sm" />
          </div>
          <div className="mt-7 max-w-lg"><ContractTimeline status={c.status} /></div>
        </Card>

        {role === 'TALENT' && c.status === 'PENDING' && (
          <Alert tone="info" title="This contract is waiting for your decision">
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => setRespond('ACCEPT')}><CheckCircle2 className="size-4" /> Accept</Button>
              <Button variant="outline" onClick={() => setRespond('REJECT')}><XCircle className="size-4" /> Decline</Button>
            </div>
          </Alert>
        )}
        {c.status === 'REJECTED' && c.talentResponseNote && <Alert tone="danger" title={role === 'TALENT' ? 'You declined this contract' : 'The talent declined this contract'}>“{c.talentResponseNote}”</Alert>}

        <Card>
          <CardHeader title="Terms" description="Read-only once issued. Promoters can amend terms while a contract is open." />
          <div className="p-6">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{c.terms}</p>
            {c.reviewNotes && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes from the promoter</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{c.reviewNotes}</p>
              </div>
            )}
            {c.status === 'ACTIVE' && c.talentResponseNote && (
              <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Talent’s message on acceptance</p>
                <p className="mt-1 text-sm text-emerald-900">{c.talentResponseNote}</p>
              </div>
            )}
          </div>
        </Card>

        {c.rating && (
          <Card className="p-6">
            <h2 className="text-base font-semibold">Rating</h2>
            <div className="mt-2"><StarRating value={c.rating.score} showValue size={20} /></div>
            {c.rating.comment && <p className="mt-2 text-sm text-slate-700">“{c.rating.comment}”</p>}
          </Card>
        )}
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader title="Summary" />
          <div className="p-5">
            <p className="font-display text-3xl font-extrabold text-slate-900">{formatMoney(c.amount, c.currency)}</p>
            <p className="mt-0.5 text-sm text-slate-500">Agreed fee</p>
            <DetailList className="mt-5 !grid-cols-2" items={[{ label: 'Issued', value: formatDate(c.createdAt) }, { label: 'Responded', value: c.respondedAt ? formatDate(c.respondedAt) : 'Awaiting' }]} />
          </div>
        </Card>

        <Card>
          <CardHeader title={role === 'TALENT' ? 'Promoter' : 'Talent'} />
          <div className="p-5">
            <div className="flex items-center gap-3">
              <Avatar firstName={role === 'TALENT' ? c.promoter.agencyName : c.talent.firstName} lastName={role === 'TALENT' ? '' : c.talent.lastName} src={role === 'TALENT' ? null : c.talent.avatarUrl} size={48} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{otherName}</p>
                <p className="truncate text-sm text-slate-500">{role === 'TALENT' ? `Contact: ${c.promoter.contactName}` : c.talent.specialization}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`${base}/messages?to=${other}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-800 hover:bg-slate-50"><MessageSquare className="size-3.5" /> Message</Link>
              {role === 'PROMOTER' && <Link href={`/promoter/talents/${c.talent.id}`} className="inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-medium text-accent-700 hover:bg-accent-50">View profile</Link>}
              <Link href={`${base}/events/${c.event.id}`} className="inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-medium text-accent-700 hover:bg-accent-50">View event</Link>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Document" />
          <div className="space-y-3 p-5">
            {c.documentUrl ? (
              <a href={c.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:bg-slate-50">
                <span className="flex size-10 items-center justify-center rounded-lg bg-accent-50 text-accent-700"><FileText className="size-5" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900">{c.documentName ?? 'Contract document'}</span><span className="text-xs text-slate-500">Open PDF</span></span>
                <Download className="size-4 text-slate-400" />
              </a>
            ) : (
              <p className="text-sm text-slate-500">No signed document has been attached.</p>
            )}
            {role === 'PROMOTER' && !closed && (
              <>
                <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
                <Button variant="outline" size="sm" loading={busy === 'upload'} onClick={() => fileRef.current?.click()}><Upload className="size-4" /> {c.documentUrl ? 'Replace PDF' : 'Attach PDF'}</Button>
              </>
            )}
          </div>
        </Card>

        {role === 'PROMOTER' && (
          <Card>
            <CardHeader title="Manage" />
            <div className="flex flex-col gap-2 p-5">
              {(c.status === 'PENDING' || c.status === 'ACTIVE') && <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="size-4" /> Edit terms</Button>}
              {c.status === 'ACTIVE' && <Button onClick={() => setConfirm('COMPLETED')}><CheckCircle2 className="size-4" /> Mark as completed</Button>}
              {(c.status === 'PENDING' || c.status === 'ACTIVE') && <Button variant="outline" className="text-red-700" onClick={() => setConfirm('CANCELLED')}><XCircle className="size-4" /> Cancel contract</Button>}
              {c.status === 'COMPLETED' && !c.rating && <Button onClick={() => setRate(true)}><Star className="size-4" /> Rate {c.talent.firstName}</Button>}
              {(closed || (c.status === 'COMPLETED' && c.rating)) && <p className="text-sm text-slate-500">No further actions are available for this contract.</p>}
            </div>
          </Card>
        )}
      </aside>

      {respond && <RespondModal open onClose={() => setRespond(null)} contract={c} decision={respond} onDone={(u) => { setRespond(null); onChange(u); }} />}
      <ContractFormModal open={edit} onClose={() => setEdit(false)} existing={c} onSaved={(u) => { setEdit(false); onChange(u); }} />
      <RateTalentModal open={rate} onClose={() => setRate(false)} contract={c} onRated={() => { setRate(false); void reload(); }} />
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => changeStatus(confirm!)}
        tone={confirm === 'COMPLETED' ? 'primary' : 'danger'}
        title={confirm === 'COMPLETED' ? 'Mark contract as completed?' : 'Cancel this contract?'}
        description={confirm === 'COMPLETED' ? 'Confirm the work has been delivered. You will then be able to rate the talent.' : `${c.talent.firstName} will be notified that the contract has been cancelled.`}
        confirmLabel={confirm === 'COMPLETED' ? 'Mark completed' : 'Cancel contract'}
      />
    </div>
  );
}
