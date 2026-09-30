'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Clapperboard, Drama, ImagePlus, Music, PartyPopper, Shirt, Sparkles, Star, Trash2, type LucideIcon } from 'lucide-react';
import type { EventImage, EventItem } from '@/lib/types';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

/** Limits mirror the API (POST /events/:id/images). */
export const MAX_EVENT_IMAGES = 8;
export const MAX_EVENT_IMAGE_BYTES = 10 * 1024 * 1024;
export const EVENT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const categoryIcon: Record<string, LucideIcon> = {
  Music,
  Festival: PartyPopper,
  Fashion: Shirt,
  Corporate: Briefcase,
  'Film & Media': Clapperboard,
  'Theatre & Dance': Drama,
};

/**
 * The event's cover photo, or a tasteful placeholder when the promoter has not added any photos yet.
 * Size it with `className` (e.g. `aspect-[16/9] w-full` or `size-16`).
 */
export function EventCover({ event, className, iconClassName }: { event: Pick<EventItem, 'title' | 'category'> & { coverImageUrl?: string | null }; className?: string; iconClassName?: string }) {
  const [failed, setFailed] = useState(false);
  const src = event.coverImageUrl;
  if (src && !failed) {
    return <img src={src} alt={event.title} loading="lazy" decoding="async" onError={() => setFailed(true)} className={cn('shrink-0 bg-slate-100 object-cover', className)} />;
  }
  const Icon = (event.category && categoryIcon[event.category]) || Sparkles;
  return (
    <div role="img" aria-label={`${event.title} (no photo yet)`} className={cn('flex shrink-0 items-center justify-center bg-gradient-to-br from-accent-100 via-accent-50 to-amber-50 text-accent-600', className)}>
      <Icon className={cn('size-1/3 max-h-12 max-w-12 opacity-70', iconClassName)} aria-hidden />
    </div>
  );
}

/** Large photo with a thumbnail strip, used on the event detail page. */
export function EventGallery({ images, title, className }: { images: EventImage[]; title: string; className?: string }) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [images]);
  if (images.length === 0) return null;
  const current = images[Math.min(active, images.length - 1)];
  return (
    <div className={cn('bg-ink', className)}>
      <div className="relative aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]">
        <img src={current.url} alt={`${title} – photo ${active + 1} of ${images.length}`} className="size-full object-cover" />
        {images.length > 1 && (
          <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-white">
            {active + 1} / {images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto bg-ink p-2" role="tablist" aria-label="Event photos">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show photo ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn('h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition', i === active ? 'ring-white' : 'opacity-60 ring-transparent hover:opacity-100')}
            >
              <img src={img.url} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Client-side checks that match the server rules, so promoters get instant feedback. */
export function checkEventImage(file: File): string | null {
  if (!EVENT_IMAGE_TYPES.includes(file.type)) return `${file.name}: only JPG, PNG, WebP or GIF images are allowed.`;
  if (file.size > MAX_EVENT_IMAGE_BYTES) return `${file.name}: images must be 10 MB or smaller.`;
  return null;
}

interface PickerProps {
  /** Photos already saved on the event (edit mode). */
  existing: EventImage[];
  /** New files chosen in this session; uploaded when the form is saved. */
  files: File[];
  onFilesChange: (files: File[]) => void;
  onRemoveExisting?: (image: EventImage) => void;
  onMakeCover?: (image: EventImage) => void;
  busyId?: string | null;
  disabled?: boolean;
  error?: string | null;
  onError: (message: string | null) => void;
}

/** Photo manager for the create/edit event form: previews, remove, choose the cover. */
export function EventImagePicker({ existing, files, onFilesChange, onRemoveExisting, onMakeCover, busyId, disabled, error, onError }: PickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const total = existing.length + files.length;
  const remaining = MAX_EVENT_IMAGES - total;

  const add = (list: FileList | null) => {
    if (!list?.length) return;
    const chosen = Array.from(list);
    const problems = chosen.map(checkEventImage).filter(Boolean) as string[];
    const valid = chosen.filter((f) => !checkEventImage(f));
    const accepted = valid.slice(0, Math.max(0, remaining));
    if (valid.length > accepted.length) problems.push(`An event can have up to ${MAX_EVENT_IMAGES} photos — ${valid.length - accepted.length} not added.`);
    onError(problems.length ? problems.join(' ') : null);
    if (accepted.length) onFilesChange([...files, ...accepted]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeNew = (i: number) => onFilesChange(files.filter((_, idx) => idx !== i));
  const coverNew = (i: number) => onFilesChange([files[i], ...files.filter((_, idx) => idx !== i)]);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">Event photos</p>
        <p className="text-[13px] text-slate-500">{total} / {MAX_EVENT_IMAGES}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {existing.map((img, i) => (
          <Thumb key={img.id} src={img.url} cover={i === 0} label={img.fileName ?? `Photo ${i + 1}`} busy={busyId === img.id} disabled={disabled}
            onCover={i === 0 || !onMakeCover ? undefined : () => onMakeCover(img)}
            onRemove={onRemoveExisting ? () => onRemoveExisting(img) : undefined} />
        ))}
        {files.map((f, i) => (
          <Thumb key={`${f.name}-${f.size}-${i}`} src={previews[i]} cover={existing.length === 0 && i === 0} label={f.name} pending disabled={disabled}
            onCover={existing.length === 0 && i > 0 ? () => coverNew(i) : undefined}
            onRemove={() => removeNew(i)} />
        ))}
        {remaining > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-600 transition-colors hover:border-accent-400 hover:bg-accent-50 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ImagePlus className="size-6" aria-hidden />
            Add photos
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" multiple accept={EVENT_IMAGE_TYPES.join(',')} className="sr-only" tabIndex={-1} aria-label="Choose event photos" onChange={(e) => add(e.target.files)} />
      {error ? (
        <p role="alert" className="text-[13px] text-red-600">{error}</p>
      ) : (
        <p className="text-[13px] text-slate-500">JPG, PNG, WebP or GIF, up to 10 MB each. The first photo is the cover shown on event cards.</p>
      )}
    </div>
  );
}

function Thumb({ src, label, cover, pending, busy, disabled, onCover, onRemove }: { src: string; label: string; cover?: boolean; pending?: boolean; busy?: boolean; disabled?: boolean; onCover?: () => void; onRemove?: () => void }) {
  return (
    <figure className={cn('group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100', busy && 'opacity-60')}>
      <img src={src} alt={label} className="size-full object-cover" />
      <div className="absolute left-1.5 top-1.5 flex gap-1">
        {cover && <span className="inline-flex items-center gap-1 rounded-full bg-accent-600 px-2 py-0.5 text-[11px] font-semibold text-white"><Star className="size-3" aria-hidden /> Cover</span>}
        {pending && <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-700">New</span>}
      </div>
      <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-ink/80 to-transparent p-1.5 pt-6">
        {onCover && (
          <Button size="sm" variant="outline" className="h-7 border-white/70 bg-white/90 px-2 text-[12px]" disabled={disabled || busy} onClick={onCover}>
            Make cover
          </Button>
        )}
        {onRemove && (
          <Button size="sm" variant="outline" className="h-7 border-white/70 bg-white/90 px-2 text-red-700" disabled={disabled || busy} onClick={onRemove} aria-label={`Remove ${label}`}>
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        )}
      </figcaption>
    </figure>
  );
}
