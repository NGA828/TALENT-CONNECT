'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate } from '@/lib/format';
import type { Paginated, RatingSummary, Review } from '@/lib/types';
import { Card, CardHeader, PageHeader } from '@/components/ui/card';
import { EmptyState, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { Avatar } from '@/components/ui/avatar';
import { Pagination } from '@/components/ui/pagination';
import { StarRating } from '@/components/ui/rating';

export function RatingsPage() {
  const [page, setPage] = useState(1);
  const state = useApi<{ summary: RatingSummary; reviews: Paginated<Review> }>('/ratings/me', { page, pageSize: 8 });
  return (
    <>
      <PageHeader title="Ratings & reviews" description="Promoters can rate you after a contract is completed. Reviews appear on your public profile." />
      <QueryState state={state} skeleton={<SkeletonRows rows={4} />}>
        {({ summary, reviews }) =>
          summary.count === 0 ? (
            <EmptyState icon={<Star className="size-6" />} title="No ratings yet" description="Ratings appear here once a promoter completes a contract with you. Enrol in events and respond to contracts to get your first review." />
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <Card className="h-fit p-6">
                <p className="font-display text-5xl font-extrabold text-slate-900">{summary.average.toFixed(1)}</p>
                <StarRating value={summary.average} size={20} className="mt-2" />
                <p className="mt-1 text-sm text-slate-500">{summary.count} review{summary.count === 1 ? '' : 's'}</p>
                <ul className="mt-5 space-y-2" aria-label="Rating distribution">
                  {[5, 4, 3, 2, 1].map((s) => {
                    const n = summary.distribution[String(s)] ?? 0;
                    const pct = summary.count ? (n / summary.count) * 100 : 0;
                    return (
                      <li key={s} className="flex items-center gap-3 text-sm">
                        <span className="w-10 text-slate-600">{s} star</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} /></span>
                        <span className="w-6 text-right tabular-nums text-slate-500">{n}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
              <Card>
                <CardHeader title="Reviews" />
                <ul className="divide-y divide-slate-100">
                  {reviews.items.map((r) => (
                    <li key={r.id} className="flex gap-4 p-5">
                      <Avatar firstName={r.author.name.split(' ')[0]} lastName={r.author.name.split(' ')[1]} src={r.author.avatarUrl} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">{r.author.name}{r.author.agencyName && <span className="font-normal text-slate-500"> · {r.author.agencyName}</span>}</p>
                          <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span>
                        </div>
                        <StarRating value={r.score} size={14} className="mt-1" />
                        {r.event && <p className="mt-1 text-xs font-medium text-accent-700">{r.event.title}</p>}
                        {r.comment && <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{r.comment}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="px-5 pb-4"><Pagination page={reviews.page} totalPages={reviews.totalPages} total={reviews.total} pageSize={reviews.pageSize} onChange={setPage} /></div>
              </Card>
            </div>
          )
        }
      </QueryState>
    </>
  );
}
