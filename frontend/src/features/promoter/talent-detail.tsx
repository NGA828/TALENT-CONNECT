'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Globe, FileSignature, MapPin, MessageSquare } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate, humanize } from '@/lib/format';
import type { EventItem, Paginated, PortfolioItem, TalentDetail } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Button, ButtonLink } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { EmptyState, QueryState, Skeleton } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/form';
import { StarRating } from '@/components/ui/rating';
import { MediaPreview } from '@/features/portfolio/media';
import { PortfolioViewer } from '@/features/portfolio/portfolio-viewer';
import { ContractFormModal } from '@/features/contracts/contract-forms';

export function TalentDetailPage({ id }: { id: string }) {
  const state = useApi<TalentDetail>(`/talents/${id}`);
  return (
    <>
      <Link href="/promoter/talents" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="size-4" /> All talent</Link>
      <QueryState state={state} skeleton={<div className="space-y-4"><Skeleton className="h-44" /><Skeleton className="h-72" /></div>}>{(t) => <Content t={t} reload={state.reload} />}</QueryState>
    </>
  );
}

function Content({ t, reload }: { t: TalentDetail; reload: () => Promise<void> | void }) {
  const [viewing, setViewing] = useState<PortfolioItem | null>(null);
  const [picking, setPicking] = useState(false);
  const [eventId, setEventId] = useState('');
  const [creating, setCreating] = useState<EventItem | null>(null);
  const events = useApi<Paginated<EventItem>>(picking ? '/events/mine' : null, { pageSize: 50 });
  const eligible = events.data?.items.filter((e) => e.status === 'PUBLISHED' || e.status === 'ONGOING') ?? [];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar firstName={t.firstName} lastName={t.lastName} src={t.avatarUrl} size={96} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">{t.firstName} {t.lastName}</h1>
            <p className="text-slate-600">{t.specialization}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              {t.ratingCount > 0 ? <StarRating value={t.ratingAvg} showValue count={t.ratingCount} size={15} /> : <span className="text-slate-400">No ratings yet</span>}
              {t.location && <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{t.location}</span>}
              <span className="inline-flex items-center gap-1"><Briefcase className="size-4" />{t.experienceYears} years experience</span>
              {t.website && <a href={t.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-700 hover:underline"><Globe className="size-4" />Website</a>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{t.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
          </div>
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <Button onClick={() => { setEventId(''); setPicking(true); }}><FileSignature className="size-4" /> Issue contract</Button>
            <ButtonLink variant="outline" href={`/promoter/messages?to=${t.userId}`}><MessageSquare className="size-4" /> Message</ButtonLink>
          </div>
        </div>
        {t.bio && <p className="mt-5 whitespace-pre-wrap border-t border-slate-100 pt-5 leading-relaxed text-slate-700">{t.bio}</p>}
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title="Portfolio" description={`${t.portfolio.length} published item${t.portfolio.length === 1 ? '' : 's'}`} />
          {t.portfolio.length === 0 ? (
            <EmptyState title="No portfolio items yet" description="This talent has not published any work." className="border-0" />
          ) : (
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {t.portfolio.map((p) => (
                <button key={p.id} onClick={() => setViewing(p)} className="group overflow-hidden rounded-xl border border-slate-200 text-left hover:shadow-md">
                  <MediaPreview type={p.mediaType} url={p.mediaUrl} title={p.title} className="h-36 rounded-none" />
                  <div className="p-3"><p className="truncate text-sm font-semibold text-slate-900">{p.title}</p><p className="text-xs text-slate-500">{humanize(p.mediaType)}</p></div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Reviews" description={t.rating.count ? `${t.rating.average.toFixed(1)} average from ${t.rating.count}` : undefined} />
            {t.reviews.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No reviews yet.</p> : (
              <ul className="divide-y divide-slate-100">
                {t.reviews.map((r) => (
                  <li key={r.id} className="p-5">
                    <div className="flex items-center justify-between"><StarRating value={r.score} size={13} /><span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span></div>
                    {r.comment && <p className="mt-2 text-sm text-slate-700">{r.comment}</p>}
                    <p className="mt-1 text-xs text-slate-500">{r.author.name}{r.author.agencyName ? ` · ${r.author.agencyName}` : ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {t.contractsWithYou.length > 0 && (
            <Card>
              <CardHeader title="Your contracts with this talent" />
              <ul className="divide-y divide-slate-100">
                {t.contractsWithYou.map((c) => (
                  <li key={c.id}><Link href={`/promoter/contracts/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50"><span className="truncate">{c.event?.title ?? c.eventTitle ?? 'Contract'}</span><StatusBadge status={c.status} /></Link></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <PortfolioViewer item={viewing} onClose={() => setViewing(null)} />

      <Modal open={picking} onClose={() => setPicking(false)} title={`Issue a contract to ${t.firstName}`} description="Contracts are attached to one of your published events." footer={<><Button variant="outline" onClick={() => setPicking(false)}>Cancel</Button><Button disabled={!eventId} onClick={() => { setCreating(eligible.find((e) => e.id === eventId) ?? null); setPicking(false); }}>Continue</Button></>}>
        {events.loading ? <Skeleton className="h-10" /> : events.error ? <p className="text-sm text-red-600">{events.error.message}</p> : eligible.length === 0 ? (
          <p className="text-sm text-slate-600">You have no published or ongoing events. Publish an event first, then return here to issue a contract. <Link href="/promoter/events/create" className="font-medium text-accent-700 hover:underline">Create an event</Link></p>
        ) : (
          <Select label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)}><option value="">Select an event</option>{eligible.map((e) => <option key={e.id} value={e.id}>{e.title} · {formatDate(e.eventDate)}</option>)}</Select>
        )}
      </Modal>
      {creating && <ContractFormModal open onClose={() => setCreating(null)} create={{ talentId: t.id, eventId: creating.id, talentName: `${t.firstName} ${t.lastName}`, eventTitle: creating.title }} onSaved={async () => { setCreating(null); await reload(); }} />}
    </div>
  );
}
