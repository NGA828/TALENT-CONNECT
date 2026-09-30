import { cn } from '@/lib/cn';
import { humanize } from '@/lib/format';

type Tone = 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'teal';
const tones: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200',
};

export function Badge({ tone = 'slate', children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  // contracts
  PENDING: 'amber', ACTIVE: 'green', COMPLETED: 'blue', CANCELLED: 'slate', REJECTED: 'red',
  // licence
  NOT_SUBMITTED: 'slate', VERIFIED: 'green',
  // payments
  SUCCESS: 'green', FAILED: 'red', REFUNDED: 'violet',
  // events
  DRAFT: 'slate', PUBLISHED: 'green', ONGOING: 'teal',
  // users / moderation
  SUSPENDED: 'red', DEACTIVATED: 'slate', FLAGGED: 'amber', REMOVED: 'red',
};

const statusLabel: Record<string, string> = { ACTIVE: 'Active', NOT_SUBMITTED: 'Not submitted' };

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={statusTone[status] ?? 'slate'} dot className={className}>
      {statusLabel[status] ?? humanize(status)}
    </Badge>
  );
}
