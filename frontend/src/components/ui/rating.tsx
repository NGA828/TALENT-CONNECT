'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

export function StarRating({ value, size = 16, className, showValue, count }: { value: number; size?: number; className?: string; showValue?: boolean; count?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} style={{ width: size, height: size }} className={cn(i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} aria-hidden />
        ))}
      </span>
      {showValue && <span className="text-sm font-semibold text-slate-800">{value.toFixed(1)}</span>}
      {count !== undefined && <span className="text-sm text-slate-500">({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange, label = 'Score' }: { value: number; onChange: (v: number) => void; label?: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          className="rounded p-0.5"
        >
          <Star className={cn('size-7 transition-colors', i <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
        </button>
      ))}
    </div>
  );
}
