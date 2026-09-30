'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Slide {
  src: string;
  alt: string;
  /** Optional short text that fades in and out together with its image. */
  caption?: ReactNode;
}

interface Props {
  slides: Slide[];
  /** Milliseconds each image stays on screen. */
  interval?: number;
  className?: string;
  /** Tailwind classes for the dark layer that keeps overlaid text readable. */
  scrimClassName?: string;
  showCaption?: boolean;
  label: string;
  /** Content rendered above the images (for example a hero headline). */
  children?: ReactNode;
}

/**
 * Ambient image slideshow: the photos cross-fade on their own with a slow zoom, no clicking required.
 * It stays on the first image for visitors who prefer reduced motion.
 */
export function Slideshow({ slides, interval = 5000, className, scrimClassName = 'bg-ink/45', showCaption = true, label, children }: Props) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const count = slides.length;

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (reduced || count < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearInterval(timer);
  }, [reduced, interval, count]);

  return (
    <div role="group" aria-label={label} className={cn('relative isolate overflow-hidden bg-ink', className)}>
      {slides.map((s, i) => (
        <div key={s.src} aria-hidden className="absolute inset-0 -z-10">
          <img
            src={s.src}
            alt=""
            loading="eager"
            decoding="async"
            className={cn('size-full object-cover [transition:opacity_1600ms_ease-in-out,transform_9000ms_ease-out]', i === index ? 'scale-100 opacity-100' : cn('opacity-0', !reduced && 'scale-110'))}
          />
        </div>
      ))}
      <div className={cn('pointer-events-none absolute inset-0 -z-10', scrimClassName)} aria-hidden />

      {children}

      {showCaption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 text-white sm:p-6">
          {slides.map((s, i) => (
            <div key={s.src} aria-hidden={i !== index} className={cn('transition-opacity duration-1000', i === index ? 'opacity-100' : 'absolute bottom-4 left-4 right-4 opacity-0 sm:bottom-6 sm:left-6')}>
              {s.caption}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
