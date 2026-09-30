'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

const control =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
const invalid = 'border-red-400 hover:border-red-400 focus:border-red-500 focus:ring-red-100';

interface FieldShellProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FieldShell({ id, label, hint, error, required, className, children }: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-800">
          {label}
          {required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface CommonProps {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, CommonProps & InputHTMLAttributes<HTMLInputElement>>(function Input(
  { label, hint, error, wrapperClassName, className, required, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <input ref={ref} id={id} required={required} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={cn(control, 'h-10', error && invalid, className)} {...rest} />
    </FieldShell>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { label, hint, error, wrapperClassName, className, required, rows = 4, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <textarea ref={ref} id={id} rows={rows} required={required} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={cn(control, 'py-2.5 leading-relaxed', error && invalid, className)} {...rest} />
    </FieldShell>
  );
});

export const Select = forwardRef<HTMLSelectElement, CommonProps & SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { label, hint, error, wrapperClassName, className, required, children, ...rest },
  ref,
) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <select ref={ref} id={id} required={required} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} className={cn(control, 'h-10 pr-8', error && invalid, className)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});

export function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input type="search" className={cn(control, 'h-10 pl-9')} {...rest} />
    </div>
  );
}

export function Checkbox({ label, className, ...rest }: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2.5 text-sm text-slate-700', className)}>
      <input type="checkbox" className="mt-0.5 size-4 rounded border-slate-300 accent-[var(--accent-600)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}
