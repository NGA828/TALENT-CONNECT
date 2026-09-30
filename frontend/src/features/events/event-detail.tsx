'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Ban, CheckCircle2, EyeOff, FilePlus2, Globe, ImagePlus, MapPin, MessageSquare, Pencil, Play, Rocket, Star, UserRoundCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useAction } from '@/lib/hooks';
import type { Enrollment, EventItem } from '@/lib/types';
import { formatDate, fullName } from '@/lib/format';
import { Card, CardHeader } from '@/components/ui/card';
import { Button, ButtonLink } from '@/components/ui/button';
import { Alert, EmptyState, ErrorState, QueryState, Skeleton, SkeletonRows } from '@/components/ui/feedback';
import { Avatar } from '@/components/ui/avatar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/rating';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/form';
import { ContractFormModal } from '@/features/contracts/contract-forms';
import { DateBlock, EventMeta } from './event-ui';
import { EventGallery } from './event-images';

export function EventDetail({ id, role }: { id: string; role: 'TALENT' | 'PROMOTER' }) {
  const state = useApi<EventItem>(`/events/${id}`);
  const base = role === 'TALENT' ? '/talent' : '/promoter';
  return (
    <>
      <Link href={`${base}/events`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="size-4" /> All events</Link>
      <QueryState state={state} skeleton={<div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-72" /></div>}>
        {(e) => (role === 'TALENT' ? <TalentView event={e} reload={state.reload} /> : <PromoterView event={e} reload={state.reload} />)}
      </QueryState>
    </>
  );
}

function Header({ event, canAddPhotos }: { event: EventItem; canAddPhotos?: boolean }) {
  return (
    <Card className="overflow-hidden">
      {event.images.length > 0 ? (
        <EventGallery images={event.images} title={event.title} />
      ) : canAddPhotos ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-slate-200 bg-slate-50 px-6 py-4">
          <p className="inline-flex items-center gap-2 text-sm text-slate-600"><ImagePlus className="size-4 text-slate-400" aria-hidden /> Events with photos get noticed by more talent.</p>
          <ButtonLink href={`/promoter/events/${event.id}/edit`} variant="outline" size="sm">Add photos</ButtonLink>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start gap-5 p-6">
        <DateBlock iso={event.eventDate} className="size-20" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {event.category && <Badge tone="violet">{event.category}</Badge>}
            <StatusBadge status={event.status} />
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{event.title}</h1>
          <EventMeta event={event} className="mt-3" />
        </div>
      </div>
    </Card>
  );
}

function Description({ event }: { event: EventItem }) {
  return (
    <Card>
      <CardHeader title="About this event" />
      <div className="space-y-4 p-6">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">{event.description}</p>
        <dl className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Talent needed</dt><dd className="mt-1 text-sm font-medium text-slate-900">{event.talentNeeded ?? 'Open to all'}</dd></div>
          <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Budget</dt><dd className="mt-1 text-sm font-medium text-slate-900">{event.budget ?? 'To be confirmed'}</dd></div>
          <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Posted</dt><dd className="mt-1 text-sm font-medium text-slate-900">{formatDate(event.createdAt)}</dd></div>
        </dl>
      </div>
    </Card>
  );
}

/* ───────────────────────── Talent ───────────────────────── */
function TalentView({ event: e, reload }: { event: EventItem; reload: () => Promise<void> }) {
  const { busy, run } = useAction();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [leave, setLeave] = useState(false);
  const [now] = useState(() => Date.now());
  const open = e.status === 'PUBLISHED' && new Date(e.eventDate).getTime() > now;

  const enrol = async () => {
    const ok = await run('enrol', () => api.post(`/events/${e.id}/enroll`, note.trim() ? { note: note.trim() } : {}), 'You are enrolled. The promoter has been notified.');
    if (ok !== undefined) {
      setNoteOpen(false);
      setNote('');
      await reload();
    }
  };
  const withdraw = async () => {
    const ok = await run('leave', () => api.del(`/events/${e.id}/enroll`), 'You have withdrawn from this event.');
    setLeave(false);
    if (ok !== undefined) await reload();
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Header event={e} />
        <Description event={e} />
      </div>
      <aside className="space-y-6">
        <Card className="p-5">
          {e.enrolled ? (
            <>
              <div className="flex items-center gap-2 text-emerald-700"><UserRoundCheck className="size-5" /><p className="font-semibold">You are enrolled</p></div>
              <p className="mt-1 text-sm text-slate-500">Enrolled on {formatDate(e.enrolledAt)}.</p>
              {e.myContract && (
                <Link href={`/talent/contracts/${e.myContract.id}`} className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-medium hover:bg-slate-50">
                  View my contract <StatusBadge status={e.myContract.status} />
                </Link>
              )}
              {open && <Button variant="outline" className="mt-4 w-full" onClick={() => setLeave(true)} loading={busy === 'leave'}>Withdraw</Button>}
            </>
          ) : open ? (
            <>
              <p className="font-semibold text-slate-900">Interested in this event?</p>
              <p className="mt-1 text-sm text-slate-500">Enrol to let {e.promoter.agencyName} know you are available. No commitment until you accept a contract.</p>
              <Button className="mt-4 w-full" onClick={() => setNoteOpen(true)}>Enrol in this event</Button>
            </>
          ) : (
            <Alert tone="warning">Enrolment is closed — this event is {e.status.toLowerCase()}.</Alert>
          )}
        </Card>
        <PromoterCard event={e} messageHref={`/talent/messages?to=${e.promoter.userId}`} />
      </aside>

      <Modal open={noteOpen} onClose={() => setNoteOpen(false)} title="Enrol in this event" description={e.title} footer={<><Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button><Button onClick={enrol} loading={busy === 'enrol'}>Confirm enrolment</Button></>}>
        <Textarea label="Note to the promoter (optional)" rows={4} maxLength={500} placeholder="Share your availability, relevant experience or equipment." value={note} onChange={(ev) => setNote(ev.target.value)} />
      </Modal>
      <ConfirmDialog open={leave} onClose={() => setLeave(false)} onConfirm={withdraw} title="Withdraw from this event?" description="You will be removed from the enrolment list. You can enrol again while the event is open." confirmLabel="Withdraw" />
    </div>
  );
}

function PromoterCard({ event, messageHref }: { event: EventItem; messageHref: string }) {
  const p = event.promoter;
  return (
    <Card>
      <CardHeader title="Organiser" />
      <div className="p-5">
        <div className="flex items-center gap-3">
          <Avatar firstName={p.agencyName} lastName="" size={48} />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate font-semibold text-slate-900">{p.agencyName}{p.verified && <BadgeCheck className="size-4 shrink-0 text-emerald-600" aria-label="Verified agency" />}</p>
            <p className="truncate text-sm text-slate-500">Contact: {p.contactName}</p>
          </div>
        </div>
        {p.description && <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-600">{p.description}</p>}
        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
          {p.location && <li className="flex items-center gap-2"><MapPin className="size-4 text-slate-400" />{p.location}</li>}
          {p.website && <li className="flex items-center gap-2"><Globe className="size-4 text-slate-400" /><a href={p.website} target="_blank" rel="noopener noreferrer" className="truncate text-accent-700 hover:underline">{p.website.replace(/^https?:\/\//, '')}</a></li>}
        </ul>
        <ButtonLink href={messageHref} variant="outline" size="sm" className="mt-4"><MessageSquare className="size-4" /> Message organiser</ButtonLink>
      </div>
    </Card>
  );
}

/* ───────────────────────── Promoter ───────────────────────── */
function PromoterView({ event: e, reload }: { event: EventItem; reload: () => Promise<void> }) {
  const { busy, run } = useAction();
  const [confirm, setConfirm] = useState<'cancel' | 'complete' | 'unpublish' | null>(null);
  const enrollments = useApi<Enrollment[]>(`/events/${e.id}/enrollments`);

  const call = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    const ok = await run(key, fn, msg);
    setConfirm(null);
    if (ok !== undefined) {
      await reload();
      await enrollments.reload();
    }
  };

  const editable = e.status === 'DRAFT' || e.status === 'PUBLISHED' || e.status === 'ONGOING';

  return (
    <div className="space-y-6">
      <Header event={e} canAddPhotos={e.status === 'DRAFT' || e.status === 'PUBLISHED' || e.status === 'ONGOING'} />
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-medium text-slate-700">Manage event</span>
          {e.status === 'DRAFT' && <Button loading={busy === 'publish'} onClick={() => void call('publish', () => api.post(`/events/${e.id}/publish`, {}), 'Event published.')}><Rocket className="size-4" /> Publish</Button>}
          {e.status === 'PUBLISHED' && <Button loading={busy === 'start'} onClick={() => void call('start', () => api.patch(`/events/${e.id}/status`, { status: 'ONGOING' }), 'Event marked as ongoing.')}><Play className="size-4" /> Start event</Button>}
          {e.status === 'ONGOING' && <Button onClick={() => setConfirm('complete')}><CheckCircle2 className="size-4" /> Mark completed</Button>}
          {editable && <ButtonLink href={`/promoter/events/${e.id}/edit`} variant="outline"><Pencil className="size-4" /> Edit</ButtonLink>}
          {e.status === 'PUBLISHED' && <Button variant="outline" onClick={() => setConfirm('unpublish')}><EyeOff className="size-4" /> Unpublish</Button>}
          {(e.status === 'DRAFT' || e.status === 'PUBLISHED' || e.status === 'ONGOING') && <Button variant="ghost" className="text-red-700" onClick={() => setConfirm('cancel')}><Ban className="size-4" /> Cancel event</Button>}
        </div>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Enrolled talent" description={`${e.enrollmentCount} ${e.enrollmentCount === 1 ? 'person has' : 'people have'} enrolled. Issue a contract to confirm a booking.`} />
          <div className="p-4 sm:p-5">
            {enrollments.loading ? (
              <SkeletonRows rows={3} />
            ) : enrollments.error ? (
              <ErrorState error={enrollments.error} onRetry={() => void enrollments.reload()} />
            ) : enrollments.data && enrollments.data.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {enrollments.data.map((en) => <EnrollmentRow key={en.id} enrollment={en} event={e} onContract={async () => { await enrollments.reload(); await reload(); }} />)}
              </ul>
            ) : (
              <EmptyState className="border-0 py-8" title="No one has enrolled yet" description={e.status === 'DRAFT' ? 'Publish the event to open enrolment.' : 'Talent who enrol will appear here. You can also search talent and message them directly.'} action={<ButtonLink href="/promoter/talents" variant="outline">Search talent</ButtonLink>} />
            )}
          </div>
        </Card>
        <div className="space-y-6">
          <Description event={e} />
        </div>
      </div>

      <ConfirmDialog open={confirm === 'cancel'} onClose={() => setConfirm(null)} onConfirm={() => call('cancel', () => api.post(`/events/${e.id}/cancel`, {}), 'Event cancelled.')} title="Cancel this event?" description="Enrolled talents will be notified and any open contracts for this event will be cancelled. This cannot be undone." confirmLabel="Cancel event" />
      <ConfirmDialog open={confirm === 'unpublish'} onClose={() => setConfirm(null)} onConfirm={() => call('unpublish', () => api.post(`/events/${e.id}/unpublish`, {}), 'Event moved back to drafts.')} tone="primary" title="Unpublish this event?" description="It will be hidden from talent and return to draft. Events with enrolled talent cannot be unpublished." confirmLabel="Unpublish" />
      <ConfirmDialog open={confirm === 'complete'} onClose={() => setConfirm(null)} onConfirm={() => call('complete', () => api.patch(`/events/${e.id}/status`, { status: 'COMPLETED' }), 'Event marked as completed.')} tone="primary" title="Mark event as completed?" description="Confirm the event has taken place. You can then close out the related contracts and rate the talent." confirmLabel="Mark completed" />
    </div>
  );
}

function EnrollmentRow({ enrollment: en, event, onContract }: { enrollment: Enrollment; event: EventItem; onContract: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const t = en.talent;
  const canIssue = (event.status === 'PUBLISHED' || event.status === 'ONGOING') && (!en.contract || en.contract.status === 'REJECTED' || en.contract.status === 'CANCELLED');
  return (
    <li className="flex flex-wrap items-center gap-4 py-4">
      <Avatar firstName={t.firstName} lastName={t.lastName} src={t.avatarUrl} size={46} />
      <div className="min-w-0 flex-1 basis-48">
        <Link href={`/promoter/talents/${t.id}`} className="font-semibold text-slate-900 hover:text-accent-700 hover:underline">{fullName(t)}</Link>
        <p className="text-sm text-slate-500">{t.specialization}{t.location ? ` · ${t.location}` : ''}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {t.ratingCount > 0 ? <StarRating value={t.ratingAvg} count={t.ratingCount} showValue size={14} /> : <span className="flex items-center gap-1 text-xs text-slate-400"><Star className="size-3.5" />No ratings yet</span>}
        </div>
        {en.note && <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[13px] text-slate-600">“{en.note}”</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {en.contract && <Link href={`/promoter/contracts/${en.contract.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium hover:bg-slate-50">Contract <StatusBadge status={en.contract.status} /></Link>}
        {canIssue && <Button size="sm" onClick={() => setOpen(true)}><FilePlus2 className="size-3.5" /> Issue contract</Button>}
        <ButtonLink size="sm" variant="ghost" href={`/promoter/messages?to=${t.userId}`} aria-label={`Message ${t.firstName}`}><MessageSquare className="size-4" /></ButtonLink>
      </div>
      <ContractFormModal open={open} onClose={() => setOpen(false)} create={{ talentId: t.id, eventId: event.id, talentName: fullName(t), eventTitle: event.title }} onSaved={async () => { setOpen(false); await onContract(); }} />
    </li>
  );
}
