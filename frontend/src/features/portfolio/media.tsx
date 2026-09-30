import { FileText, Music2, PlayCircle } from 'lucide-react';
import type { MediaType } from '@/lib/types';
import { cn } from '@/lib/cn';

export const MEDIA_LIMITS: Record<MediaType, { label: string; maxMb: number; mimes: string[] }> = {
  IMAGE: { label: 'Image', maxMb: 10, mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
  VIDEO: { label: 'Video', maxMb: 50, mimes: ['video/mp4', 'video/webm', 'video/quicktime'] },
  AUDIO: { label: 'Audio', maxMb: 20, mimes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'] },
  DOCUMENT: { label: 'Document', maxMb: 10, mimes: ['application/pdf'] },
};

export const ACCEPT = Object.values(MEDIA_LIMITS).flatMap((m) => m.mimes).join(',');

/** Client-side pre-check that mirrors the server rules (the server remains the authority). */
export function checkFile(file: File): string | null {
  const entry = Object.values(MEDIA_LIMITS).find((m) => m.mimes.includes(file.type.toLowerCase()));
  if (!entry) return 'Unsupported file type. Use JPG, PNG, GIF, WebP, MP4, WebM, MOV, MP3, WAV, OGG, M4A or PDF.';
  if (file.size > entry.maxMb * 1024 * 1024) return `${entry.label} files can be up to ${entry.maxMb} MB. This file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`;
  return null;
}

export function MediaPreview({ type, url, title, className, controls = false }: { type: MediaType; url: string; title: string; className?: string; controls?: boolean }) {
  if (type === 'IMAGE') return <img src={url} alt={title} loading="lazy" className={cn('size-full object-cover', className)} />;
  if (type === 'VIDEO') {
    return controls ? (
      <video src={url} controls preload="metadata" className={cn('size-full bg-black object-contain', className)} aria-label={title} />
    ) : (
      <div className={cn('relative size-full bg-slate-900', className)}>
        <video src={`${url}#t=0.5`} preload="metadata" muted className="size-full object-cover opacity-80" aria-hidden />
        <PlayCircle className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow" aria-hidden />
      </div>
    );
  }
  if (type === 'AUDIO') {
    return (
      <div className={cn('flex size-full flex-col items-center justify-center gap-3 bg-accent-50 p-4', className)}>
        <Music2 className="size-10 text-accent-600" aria-hidden />
        {controls && <audio src={url} controls preload="metadata" className="w-full max-w-sm" aria-label={title} />}
      </div>
    );
  }
  return (
    <div className={cn('flex size-full flex-col items-center justify-center gap-2 bg-slate-100 p-4 text-slate-500', className)}>
      <FileText className="size-10 text-slate-400" aria-hidden />
      <span className="text-xs font-medium uppercase tracking-wide">PDF document</span>
    </div>
  );
}
