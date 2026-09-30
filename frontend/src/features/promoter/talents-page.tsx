'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, SlidersHorizontal, Users } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { useDebounce } from '@/lib/hooks';
import { humanize } from '@/lib/format';
import type { Paginated, PublicMeta, TalentCard } from '@/lib/types';
import { PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState, QueryState, SkeletonCards } from '@/components/ui/feedback';
import { SearchInput, Select, Input } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { StarRating } from '@/components/ui/rating';
import { Badge } from '@/components/ui/badge';
import { MediaPreview } from '@/features/portfolio/media';

const defaults = { q: '', specialization: '', location: '', minRating: '', minExperience: '', gender: '', sort: 'rating' };

export function TalentSearchPage() {
  const [f, setF] = useState(defaults);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const meta = useApi<PublicMeta>('/public/meta');
  const dq = useDebounce(f.q);
  const dl = useDebounce(f.location);
  const state = useApi<Paginated<TalentCard>>('/talents', { ...f, q: dq, location: dl, page, pageSize: 9 });
  const set = (k: keyof typeof defaults, v: string) => { setF((p) => ({ ...p, [k]: v })); setPage(1); };
  const active = Object.entries(f).some(([k, v]) => k !== 'sort' && v);

  return (
    <>
      <PageHeader title="Find talent" description="Search verified creatives by specialization, location, experience and rating." />
      <div className="mb-6 rounded-card border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <SearchInput aria-label="Search talent" className="min-w-56 flex-1" placeholder="Search by name, skill or keyword" value={f.q} onChange={(e) => set('q', e.target.value)} />
          <Select aria-label="Specialization" className="w-full sm:w-52" value={f.specialization} onChange={(e) => set('specialization', e.target.value)}>
            <option value="">All specializations</option>
            {meta.data?.specializations.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select aria-label="Sort by" className="w-full sm:w-44" value={f.sort} onChange={(e) => set('sort', e.target.value)}>
            <option value="rating">Top rated</option><option value="experience">Most experienced</option><option value="newest">Newest</option><option value="name">Name A–Z</option>
          </Select>
          <Button variant="outline" onClick={() => setOpen((o) => !o)} aria-expanded={open}><SlidersHorizontal className="size-4" /> More filters</Button>
        </div>
        {open && (
          <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Location" placeholder="City or country" value={f.location} onChange={(e) => set('location', e.target.value)} />
            <Select label="Minimum rating" value={f.minRating} onChange={(e) => set('minRating', e.target.value)}><option value="">Any rating</option>{[4.5, 4, 3].map((r) => <option key={r} value={r}>{r}+ stars</option>)}</Select>
            <Select label="Experience" value={f.minExperience} onChange={(e) => set('minExperience', e.target.value)}><option value="">Any</option>{[2, 5, 8, 10].map((y) => <option key={y} value={y}>{y}+ years</option>)}</Select>
            <Select label="Gender" value={f.gender} onChange={(e) => set('gender', e.target.value)}><option value="">Any</option>{meta.data?.genders.map((g) => <option key={g} value={g}>{humanize(g)}</option>)}</Select>
          </div>
        )}
      </div>

      <QueryState state={state} skeleton={<SkeletonCards count={6} />}>
        {(d) =>
          d.items.length === 0 ? (
            <EmptyState filtered={active} icon={<Users className="size-6" />} title="No talent matches these filters" description="Try a broader specialization, lower the minimum rating or clear the location." action={active ? <Button variant="outline" onClick={() => { setF(defaults); setPage(1); }}>Clear filters</Button> : undefined} />
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-500">{d.total} creative{d.total === 1 ? '' : 's'} found</p>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2 xl:grid-cols-3">
                {d.items.map((t) => (
                  <Link key={t.id} href={`/promoter/talents/${t.id}`} className="group flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white transition-shadow hover:shadow-md">
                    <div className={`grid h-28 gap-px bg-slate-100 ${({ 0: "grid-cols-1", 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" } as Record<number, string>)[Math.min(t.portfolioPreview.length, 3)]}`}>
                      {t.portfolioPreview.slice(0, 3).map((p) => <MediaPreview key={p.id} type={p.mediaType} url={p.mediaUrl} title={p.title} className="h-28 rounded-none" />)}
                      {t.portfolioPreview.length === 0 && <div className="flex items-center justify-center text-xs text-slate-400">No portfolio yet</div>}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-3">
                        <Avatar firstName={t.firstName} lastName={t.lastName} src={t.avatarUrl} size={44} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 group-hover:text-accent-700">{t.firstName} {t.lastName}</p>
                          <p className="truncate text-sm text-slate-500">{t.specialization}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        {t.ratingCount > 0 ? <StarRating value={t.ratingAvg} size={14} showValue count={t.ratingCount} /> : <span className="text-slate-400">No ratings yet</span>}
                        <span className="text-slate-500">{t.experienceYears} yr{t.experienceYears === 1 ? '' : 's'}</span>
                      </div>
                      {t.location && <p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin className="size-3.5" />{t.location}</p>}
                      <div className="mt-3 flex flex-wrap gap-1.5">{t.skills.slice(0, 3).map((s) => <Badge key={s}>{s}</Badge>)}{t.skills.length > 3 && <Badge>+{t.skills.length - 3}</Badge>}</div>
                    </div>
                  </Link>
                ))}
              </div>
              <Pagination page={d.page} totalPages={d.totalPages} total={d.total} pageSize={d.pageSize} onChange={setPage} />
            </>
          )
        }
      </QueryState>
    </>
  );
}
