'use client';

import { useId, useState } from 'react';
import { X } from 'lucide-react';

export function TagInput({ label, value, onChange, max = 12, hint }: { label: string; value: string[]; onChange: (v: string[]) => void; max?: number; hint?: string }) {
  const id = useId();
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const tag = raw.trim().replace(/\s+/g, ' ');
    if (!tag || tag.length > 40) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase()) || value.length >= max) return;
    onChange([...value, tag]);
    setDraft('');
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">{label}</label>
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-300 bg-white p-2 focus-within:border-accent-600 focus-within:ring-2 focus-within:ring-accent-200">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md bg-accent-50 px-2 py-1 text-sm text-accent-800">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="rounded p-0.5 hover:bg-accent-100"><X className="size-3" /></button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value.replace(',', '')) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(draft)}
          disabled={value.length >= max}
          placeholder={value.length >= max ? `Maximum of ${max} skills` : 'Type a skill and press Enter'}
          className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      <p className="text-[13px] text-slate-500">{hint ?? `Up to ${max} skills. Press Enter or comma to add.`}</p>
    </div>
  );
}
