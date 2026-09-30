import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

const palette = ['bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700'];

export function Avatar({ firstName, lastName, src, size = 40, className }: { firstName?: string; lastName?: string; src?: string | null; size?: number; className?: string }) {
  const seed = `${firstName ?? ''}${lastName ?? ''}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  if (src) {
    return <img src={src} alt={`${firstName ?? ''} ${lastName ?? ''}`.trim()} style={style} className={cn('shrink-0 rounded-full object-cover', className)} />;
  }
  return (
    <span aria-hidden style={style} className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', palette[seed % palette.length], className)}>
      {initials(firstName, lastName)}
    </span>
  );
}
