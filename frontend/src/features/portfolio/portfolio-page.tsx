'use client';

import { useState } from 'react';
import { EyeOff, ImagePlus, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { useAction, useDebounce } from '@/lib/hooks';
import { formatBytes, formatDate } from '@/lib/format';
import type { MediaType, PortfolioItem, PortfolioList } from '@/lib/types';
import { PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, EmptyState, QueryState, SkeletonCards } from '@/components/ui/feedback';
import { SearchInput } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { MEDIA_LIMITS, MediaPreview } from './media';
import { PortfolioFormModal } from './portfolio-form';

type Filter = 'ALL' | MediaType;

export function PortfolioPage() {
  const [type, setType] = useState<Filter>('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const state = useApi<PortfolioList>('/portfolios/mine', { type: type === 'ALL' ? undefined : type, q: dq, page, pageSize: 9 });
  const [form, setForm] = useState<{ item?: PortfolioItem } | null>(null);
  const [view, setView] = useState<PortfolioItem | null>(null);
  const [toDelete, setToDelete] = useState<PortfolioItem | null>(null);
  const { busy, run } = useAction();
  const by = state.data?.stats.byType ?? {};

  const togglePublish = async (p: PortfolioItem) => {
    const form = new FormData();
    form.append('isPublished', String(!p.isPublished));
    const ok = await run(`pub-${p.id}`, () => api.upload('PATCH', `/portfolios/${p.id}`, form), p.isPublished ? 'Hidden from your public profile.' : 'Published on your public profile.');
    if (ok !== undefined) await state.reload();
  };
  const remove = async () => {
    if (!toDelete) return;
    const ok = await run('delete', () => api.del(`/portfolios/${toDelete.id}`), 'Portfolio item deleted.');
    setToDelete(null);
    if (ok !== undefined) await state.reload();
  };

  return (
    <>
      <PageHeader title="Portfolio" description="Show promoters what you can do. Published items appear on your public profile." actions={<Button onClick={() => setForm({})}><ImagePlus className="size-4" /> Add item</Button>} />

      {state.data && state.data.stats.flagged > 0 && (
        <Alert tone="warning" title="Some items were flagged by a moderator" className="mb-5">Flagged items are hidden from promoters until they are reviewed. Open an item to read the moderator’s note.</Alert>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Media type"
          value={type}
          onChange={(v) => { setType(v); setPage(1); }}
          items={[
            { value: 'ALL', label: 'All', count: state.data?.stats.total },
            ...(Object.keys(MEDIA_LIMITS) as MediaType[]).map((k) => ({ value: k, label: `${MEDIA_LIMITS[k].label}s`, count: by[k] ?? 0 })),
          ]}
        />
        <SearchInput aria-label="Search portfolio" className="w-full sm:w-64" placeholder="Search by title" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>

      <QueryState state={state} skeleton={<SkeletonCards count={6} />}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              filtered={type !== 'ALL' || !!q}
              icon={<ImagePlus className="size-6" />}
              title={type !== 'ALL' || q ? 'Nothing matches this filter' : 'Your portfolio is empty'}
              description={type !== 'ALL' || q ? 'Try another media type or search term.' : 'Add your best photos, clips, mixes or documents. Profiles with portfolios get noticed more often.'}
              action={type === 'ALL' && !q ? <Button onClick={() => setForm({})}>Upload your first item</Button> : undefined}
            />
          ) : (
            <>
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-xs">
                    <button onClick={() => setView(p)} className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100" aria-label={`Open ${p.title}`}>
                      <MediaPreview type={p.mediaType} url={p.mediaUrl} title={p.title} />
                      <Badge className="absolute left-3 top-3 bg-white/95">{MEDIA_LIMITS[p.mediaType].label}</Badge>
                      {p.moderationStatus !== 'ACTIVE' && <Badge tone={p.moderationStatus === 'FLAGGED' ? 'amber' : 'red'} className="absolute right-3 top-3 bg-white"><TriangleAlert className="size-3" />{p.moderationStatus === 'FLAGGED' ? 'Flagged' : 'Removed'}</Badge>}
                    </button>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-display text-base font-bold text-slate-900">{p.title}</h3>
                        {!p.isPublished && <Badge tone="slate"><EyeOff className="size-3" />Hidden</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{formatBytes(p.fileSize)} · Added {formatDate(p.createdAt)}</p>
                      {p.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
                      <div className="mt-4 flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setForm({ item: p })}><Pencil className="size-3.5" /> Edit</Button>
                        <Button size="sm" variant="ghost" loading={busy === `pub-${p.id}`} onClick={() => void togglePublish(p)}>{p.isPublished ? 'Hide' : 'Publish'}</Button>
                        <Button size="sm" variant="ghost" className="ml-auto" aria-label={`Delete ${p.title}`} onClick={() => setToDelete(p)}><Trash2 className="size-4 text-red-600" /></Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
            </>
          )
        }
      </QueryState>

      <PortfolioFormModal open={!!form} existing={form?.item} onClose={() => setForm(null)} onSaved={() => void state.reload()} />
      <Modal open={!!view} onClose={() => setView(null)} size="xl" title={view?.title ?? ''} description={view ? `${MEDIA_LIMITS[view.mediaType].label} · ${view.fileName}` : undefined}>
        {view && (
          <div className="space-y-4">
            {view.moderationNote && <Alert tone={view.moderationStatus === 'REMOVED' ? 'danger' : 'warning'} title={`Moderator note (${view.moderationStatus.toLowerCase()})`}>{view.moderationNote}</Alert>}
            <div className="overflow-hidden rounded-xl bg-slate-100">
              {view.mediaType === 'DOCUMENT' ? (
                <div className="flex flex-col items-center gap-3 p-10"><MediaPreview type="DOCUMENT" url={view.mediaUrl} title={view.title} className="h-28 bg-transparent" /><a href={view.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent-700 hover:underline">Open PDF in a new tab</a></div>
              ) : (
                <MediaPreview type={view.mediaType} url={view.mediaUrl} title={view.title} controls className="max-h-[60vh] min-h-48" />
              )}
            </div>
            {view.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{view.description}</p>}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="Delete this item?" description={toDelete ? `“${toDelete.title}” and its file will be permanently removed.` : ''} confirmLabel="Delete" />
    </>
  );
}
