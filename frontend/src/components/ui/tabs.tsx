'use client';

import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({ items, value, onChange, className, label = 'Filter' }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string; label?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn('scrollbar-thin inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', value === it.value ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900')}
        >
          {it.label}
          {it.count !== undefined && <span className={cn('rounded-full px-1.5 text-xs tabular-nums', value === it.value ? 'bg-accent-100 text-accent-700' : 'bg-slate-200 text-slate-600')}>{it.count}</span>}
        </button>
      ))}
    </div>
  );
}
