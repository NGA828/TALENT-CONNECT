import Link from 'next/link';
import { CalendarDays, ChevronRight, MapPin } from 'lucide-react';
import type { Contract, ContractStatus } from '@/lib/types';
import { formatDate, formatMoney, fullName } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { Check, CircleDot, X } from 'lucide-react';

export function ContractRow({ contract, href, role }: { contract: Contract; href: string; role: 'TALENT' | 'PROMOTER' }) {
  const counterpart = role === 'TALENT' ? { first: contract.promoter.agencyName, last: '', label: contract.promoter.agencyName, sub: `via ${contract.promoter.contactName}` } : { first: contract.talent.firstName, last: contract.talent.lastName, label: fullName(contract.talent), sub: contract.talent.specialization };
  return (
    <Link href={href} className="group flex flex-wrap items-center gap-4 rounded-card border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-md sm:flex-nowrap sm:p-5">
      <Avatar firstName={counterpart.first} lastName={counterpart.last} src={role === 'PROMOTER' ? contract.talent.avatarUrl : null} size={44} />
      <div className="min-w-0 flex-1 basis-56">
        <p className="truncate font-display text-base font-bold text-slate-900">{contract.event.title}</p>
        <p className="truncate text-sm text-slate-600">{counterpart.label} <span className="text-slate-400">· {counterpart.sub}</span></p>
        <p className="mt-1 flex flex-wrap gap-x-4 text-[13px] text-slate-500">
          <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{formatDate(contract.event.eventDate)}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{contract.event.location}</span>
        </p>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <p className="font-display text-base font-bold text-slate-900">{formatMoney(contract.amount, contract.currency)}</p>
          <p className="text-xs text-slate-500">Issued {formatDate(contract.createdAt)}</p>
        </div>
        <StatusBadge status={contract.status} />
        <ChevronRight className="hidden size-5 text-slate-300 group-hover:text-accent-600 sm:block" aria-hidden />
      </div>
    </Link>
  );
}

const steps: { key: string; label: string }[] = [
  { key: 'PENDING', label: 'Issued' },
  { key: 'ACTIVE', label: 'Accepted' },
  { key: 'COMPLETED', label: 'Completed' },
];

/** Horizontal progress for the contract lifecycle; closed states (declined / cancelled) show a terminal step. */
export function ContractTimeline({ status }: { status: ContractStatus }) {
  const closed = status === 'REJECTED' || status === 'CANCELLED';
  const idx = steps.findIndex((s) => s.key === status);
  const items = closed ? [steps[0], { key: status, label: status === 'REJECTED' ? 'Declined' : 'Cancelled' }] : steps;
  return (
    <ol className="flex items-center" aria-label="Contract progress">
      {items.map((s, i) => {
        const done = closed ? i === 0 : i <= idx;
        const terminalBad = closed && i === 1;
        const Icon = terminalBad ? X : done ? Check : CircleDot;
        return (
          <li key={s.key} className={cn('flex items-center', i < items.length - 1 && 'flex-1')}>
            <span className="flex flex-col items-center gap-1.5">
              <span className={cn('flex size-8 items-center justify-center rounded-full', terminalBad ? 'bg-red-100 text-red-600' : done ? 'bg-accent-600 text-white' : 'bg-slate-100 text-slate-400')}><Icon className="size-4" /></span>
              <span className={cn('text-xs font-medium', done || terminalBad ? 'text-slate-900' : 'text-slate-400')}>{s.label}</span>
            </span>
            {i < items.length - 1 && <span className={cn('mx-2 mb-5 h-0.5 flex-1 rounded', done && (closed ? false : i < idx) ? 'bg-accent-600' : 'bg-slate-200')} />}
          </li>
        );
      })}
    </ol>
  );
}
