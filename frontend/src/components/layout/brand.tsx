import Link from 'next/link';
import { cn } from '@/lib/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-accent-600" />
      <circle cx="11" cy="16" r="4.2" fill="none" stroke="#fff" strokeWidth="2.4" />
      <circle cx="21" cy="16" r="4.2" fill="none" stroke="#fff" strokeWidth="2.4" />
    </svg>
  );
}

export function Brand({ href = '/', tone = 'light', className }: { href?: string; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5 font-display text-[17px] font-bold tracking-tight', tone === 'dark' ? 'text-white' : 'text-slate-900', className)}>
      <BrandMark />
      Talent Connect
    </Link>
  );
}
