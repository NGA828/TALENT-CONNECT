'use client';

import { useState } from 'react';
import { FileSignature } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { useDebounce } from '@/lib/hooks';
import type { ContractList, ContractStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/card';
import { EmptyState, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { SearchInput } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import { ButtonLink } from '@/components/ui/button';
import { ContractRow } from './contract-ui';

type Filter = 'ALL' | ContractStatus;

export function ContractsPage({ role }: { role: 'TALENT' | 'PROMOTER' }) {
  const [status, setStatus] = useState<Filter>('ALL');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  const state = useApi<ContractList>('/contracts', { status: status === 'ALL' ? undefined : status, q: dq, page, pageSize: 10 });
  const base = role === 'TALENT' ? '/talent/contracts' : '/promoter/contracts';
  const counts = state.data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  const tabs: { value: Filter; label: string; count?: number }[] = [
    { value: 'ALL', label: 'All', count: state.data ? total : undefined },
    { value: 'PENDING', label: 'Pending', count: counts.PENDING ?? 0 },
    { value: 'ACTIVE', label: 'Active', count: counts.ACTIVE ?? 0 },
    { value: 'COMPLETED', label: 'Completed', count: counts.COMPLETED ?? 0 },
    { value: 'REJECTED', label: 'Declined', count: counts.REJECTED ?? 0 },
    { value: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title="Contracts"
        description={role === 'TALENT' ? 'Contracts issued to you by promoters. Read the terms, then accept or decline pending offers.' : 'Contracts you have issued to talent. Track responses and close them out after the event.'}
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Contract status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} items={tabs} />
        <SearchInput aria-label="Search contracts" className="w-full sm:w-72" placeholder="Search by event or name" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      <QueryState state={state} skeleton={<SkeletonRows rows={4} />}>
        {(data) =>
          data.items.length === 0 ? (
            <EmptyState
              filtered={status !== 'ALL' || !!q}
              icon={<FileSignature className="size-6" />}
              title={status !== 'ALL' || q ? 'No contracts match this view' : 'No contracts yet'}
              description={role === 'TALENT' ? 'When a promoter sends you a contract it will appear here. Enrolling in events is the best way to get noticed.' : 'Open one of your events, review enrolled talent and issue a contract.'}
              action={status === 'ALL' && !q ? <ButtonLink href={role === 'TALENT' ? '/talent/events' : '/promoter/events'}>{role === 'TALENT' ? 'Browse events' : 'Go to my events'}</ButtonLink> : undefined}
            />
          ) : (
            <>
              <div className="space-y-3">{data.items.map((c) => <ContractRow key={c.id} contract={c} href={`${base}/${c.id}`} role={role} />)}</div>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
            </>
          )
        }
      </QueryState>
    </>
  );
}
