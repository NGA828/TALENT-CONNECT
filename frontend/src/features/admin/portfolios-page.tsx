'use client';

import { useState } from 'react';
import { Images } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useDebounce } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { formatDate, humanize } from '@/lib/format';
import type { AdminPortfolioRow, ModerationStatus, Paginated } from '@/lib/types';
import { PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState, QueryState, SkeletonCards } from '@/components/ui/feedback';
import { SearchInput, Select } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { MediaPreview } from '@/features/portfolio/media';
import { PortfolioViewer } from '@/features/portfolio/portfolio-viewer';
import { ReasonModal } from './reason-modal';

type Filter = 'ALL' | ModerationStatus;
type Action = 'FLAG' | 'REMOVE' | 'RESTORE';

export function AdminPortfoliosPage() {
  const toast = useToast();
  const [status, setStatus] = useState<Filter>('ALL');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<AdminPortfolioRow | null>(null);
  const [target, setTarget] = useState<{ item: AdminPortfolioRow; action: Action } | null>(null);
  const [busy, setBusy] = useState(false);
  const dq = useDebounce(q);
  const state = useApi<Paginated<AdminPortfolioRow>>('/admin/portfolios', { status: status === 'ALL' ? undefined : status, type, q: dq, page, pageSize: 12 });

  const moderate = async (note: string) => {
    if (!target) return;
    setBusy(true);
    try {
      await api.patch(`/admin/portfolios/${target.item.id}/moderate`, { action: target.action, note: note || undefined });
      toast.success(target.action === 'RESTORE' ? 'Item restored.' : target.action === 'FLAG' ? 'Item flagged for review.' : 'Item removed from public view.');
      setTarget(null);
      await state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const labels: Record<Action, { title: string; button: string; tone: 'primary' | 'danger'; required: boolean }> = {
    FLAG: { title: 'Flag this item', button: 'Flag item', tone: 'primary', required: true },
    REMOVE: { title: 'Remove this item', button: 'Remove item', tone: 'danger', required: true },
    RESTORE: { title: 'Restore this item', button: 'Restore item', tone: 'primary', required: false },
  };

  return (
    <>
      <PageHeader title="Portfolio moderation" description="Flag questionable uploads for review, remove those that break the rules, and restore items that were flagged by mistake." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Moderation status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} items={[{ value: 'ALL', label: 'All' }, { value: 'ACTIVE', label: 'Visible' }, { value: 'FLAGGED', label: 'Flagged' }, { value: 'REMOVED', label: 'Removed' }]} />
        <div className="flex flex-wrap gap-3">
          <Select aria-label="Media type" className="w-36" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">All types</option><option value="IMAGE">Images</option><option value="VIDEO">Video</option><option value="AUDIO">Audio</option><option value="DOCUMENT">Documents</option></Select>
          <SearchInput aria-label="Search portfolios" className="w-full sm:w-64" placeholder="Search title or talent" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
      </div>
      <QueryState state={state} skeleton={<SkeletonCards count={8} />}>
        {(d) =>
          d.items.length === 0 ? (
            <EmptyState filtered={status !== 'ALL' || !!q || !!type} icon={<Images className="size-6" />} title="Nothing to moderate here" description="No portfolio items match this view." />
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {d.items.map((p) => (
                  <article key={p.id} className="flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white">
                    <button onClick={() => setView(p)} aria-label={`View ${p.title}`} className="block"><MediaPreview type={p.mediaType} url={p.mediaUrl} title={p.title} className="h-40 rounded-none" /></button>
                    <div className="flex flex-1 flex-col p-3.5">
                      <div className="flex items-start justify-between gap-2"><h3 className="truncate text-sm font-semibold text-slate-900">{p.title}</h3><StatusBadge status={p.moderationStatus} /></div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{p.talent.user.firstName} {p.talent.user.lastName} · {humanize(p.mediaType)} · {formatDate(p.createdAt)}</p>
                      {p.moderationNote && <p className="mt-2 line-clamp-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">Note: {p.moderationNote}</p>}
                      <div className="mt-auto flex gap-2 pt-3">
                        {p.moderationStatus === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => setTarget({ item: p, action: 'FLAG' })}>Flag</Button>}
                        {p.moderationStatus !== 'REMOVED' && <Button size="sm" variant="danger" onClick={() => setTarget({ item: p, action: 'REMOVE' })}>Remove</Button>}
                        {p.moderationStatus !== 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => setTarget({ item: p, action: 'RESTORE' })}>Restore</Button>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <Pagination page={d.page} totalPages={d.totalPages} total={d.total} pageSize={d.pageSize} onChange={setPage} />
            </>
          )
        }
      </QueryState>
      <PortfolioViewer item={view} onClose={() => setView(null)} />
      {target && <ReasonModal open onClose={() => setTarget(null)} busy={busy} tone={labels[target.action].tone} required={labels[target.action].required} label="Moderator note" title={`${labels[target.action].title}: ${target.item.title}`} description="The talent is notified and sees your note." confirmLabel={labels[target.action].button} onSubmit={moderate} />}
    </>
  );
}
