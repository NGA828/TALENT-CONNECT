'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Slide {
  src: string;
  alt: string;
  /** Shown bottom-left over the image when `showCaption` is on. */
  caption?: ReactNode;
}

interface Props {
  slides: Slide[];
  /** Milliseconds each slide stays on screen. */
  interval?: number;
  className?: string;
  /** Tailwind classes for the dark layer that keeps overlaid text readable. */
  scrimClassName?: string;
  showCaption?: boolean;
  /** `full` = arrows, pause and dots; `dots` = dots only (compact banners). */
  controls?: 'full' | 'dots';
  label: string;
  /** Content rendered above the slides (e.g. a hero headline). */
  children?: ReactNode;
}

/**
 * Cross-fading image slideshow. Advances automatically, pauses on hover/focus and via the pause button,
 * does not autoplay for visitors who prefer reduced motion, and is fully keyboard operable.
 */
export function Slideshow({ slides, interval = 6000, className, scrimClassName = 'bg-ink/45', showCaption = true, controls = 'full', label, children }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);

  useEffect(() => {
    if (!playing || hovered || count < 2) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearTimeout(timer);
  }, [index, playing, hovered, interval, count]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className={cn('group/slides relative isolate overflow-hidden bg-ink', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1);
        if (e.key === 'ArrowLeft') go(index - 1);
      }}
    >
      {slides.map((s, i) => (
        <div key={s.src} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} aria-hidden={i !== index} className="absolute inset-0 -z-10">
          <img
            src={s.src}
            alt={i === index ? s.alt : ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className={cn('size-full object-cover transition-[opacity,transform] duration-1000 ease-out', i === index ? 'scale-100 opacity-100' : 'scale-105 opacity-0')}
          />
        </div>
      ))}
      <div className={cn('pointer-events-none absolute inset-0 -z-10', scrimClassName)} aria-hidden />

      {children}

      {count > 1 && (
        <div className={cn('absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-4 sm:p-6', controls === 'dots' && 'justify-center')}>
          {showCaption && controls === 'full' && <div className="min-w-0 text-white" aria-live={playing ? 'off' : 'polite'}>{slides[index].caption}</div>}
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-ink/60 px-2 py-1.5 backdrop-blur">
            {controls === 'full' && (
              <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="rounded-full p-1.5 text-white hover:bg-white/15"><ChevronLeft className="size-4" /></button>
            )}
            <div className="flex items-center gap-1.5 px-1">
              {slides.map((s, i) => (
                <button key={s.src} type="button" onClick={() => go(i)} aria-label={`Show slide ${i + 1}`} aria-current={i === index} className="group/dot flex h-5 items-center">
                  <span className={cn('block h-1.5 rounded-full transition-all', i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/50 group-hover/dot:bg-white/80')} />
                </button>
              ))}
            </div>
            {controls === 'full' && (
              <>
                <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="rounded-full p-1.5 text-white hover:bg-white/15"><ChevronRight className="size-4" /></button>
                <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} className="rounded-full p-1.5 text-white hover:bg-white/15">{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
