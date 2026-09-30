import type { ReactNode } from 'react';
import { Brand } from '@/components/layout/brand';
import { Slideshow, type Slide } from '@/components/ui/slideshow';

export interface AuthSlide {
  image: string;
  alt: string;
  text: string;
  by: string;
}

export const LOGIN_SLIDES: AuthSlide[] = [
  { image: '/images/band-live-stage.jpg', alt: 'Live band performing on a lit stage', text: 'Every great night out starts with someone reliable behind the lens, the decks or the lights.', by: 'The Talent Connect community' },
  { image: '/images/dj-club-set.jpg', alt: 'DJ playing a club set', text: 'Your next booking is one message away. Pick up where you left off.', by: 'Contracts, messages and events in one place' },
  { image: '/images/mc-gala.jpg', alt: 'Host on stage at a gala dinner', text: 'Clear contracts and real reviews mean everyone shows up ready.', by: 'Built for talent and promoters' },
  { image: '/images/festival-crowd.jpg', alt: 'Festival crowd with hands in the air', text: 'From club nights to festival main stages, find the crew that makes it happen.', by: 'Live events, properly staffed' },
];

export const TALENT_SLIDES: AuthSlide[] = [
  { image: '/images/fashion-editorial.jpg', alt: 'Editorial fashion shoot', text: 'Put your best work in front of promoters who are hiring this month.', by: 'For photographers, DJs, dancers, hosts and crews' },
  { image: '/images/makeup-editorial.jpg', alt: 'Makeup artist portrait', text: 'Build a portfolio with images, video, audio and PDFs that promoters can actually browse.', by: 'Your portfolio, your rules' },
  { image: '/images/dancer-contemporary.jpg', alt: 'Contemporary dancer mid-movement', text: 'Enrol in events, accept contracts and collect ratings that follow you.', by: 'Reputation that travels' },
  { image: '/images/film-cinematic.jpg', alt: 'Cinematographer at sunset', text: 'Let the AI assistant polish your bio and draft the message you keep putting off.', by: 'A writing partner built in' },
];

export const PROMOTER_SLIDES: AuthSlide[] = [
  { image: '/images/lighting-stage.jpg', alt: 'Stage lighting rig', text: 'Verified agencies get the trust badge, and the best talent on the platform.', by: 'For promoters and event agencies' },
  { image: '/images/festival-crowd.jpg', alt: 'Festival crowd', text: 'Publish events, review who enrols and issue contracts without the email chains.', by: 'Run your bookings end to end' },
  { image: '/images/mc-gala.jpg', alt: 'Host at a gala', text: 'Search talent by specialization, location, experience and rating, then read the reviews.', by: 'Find the right person faster' },
  { image: '/images/street-night.jpg', alt: 'Street photography at night', text: 'Submit your licence once. Our admins verify it, and every talent sees the badge.', by: 'Trust built into the platform' },
];

function toSlides(slides: AuthSlide[], withCaption: boolean): Slide[] {
  return slides.map((s) => ({
    src: s.image,
    alt: s.alt,
    caption: withCaption ? (
      <>
        <p className="max-w-md text-xl font-bold leading-snug sm:text-2xl">{s.text}</p>
        <p className="mt-2 text-sm text-slate-300">{s.by}</p>
      </>
    ) : undefined,
  }));
}

export function AuthLayout({ title, subtitle, children, slides = LOGIN_SLIDES }: { title: string; subtitle: string; children: ReactNode; slides?: AuthSlide[] }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col bg-white">
        <Slideshow className="h-44 lg:hidden" slides={toSlides(slides, false)} controls="dots" label="Talent Connect highlights" scrimClassName="bg-ink/35" interval={5000} />
        <div className="flex flex-1 flex-col px-4 py-8 sm:px-10">
          <Brand />
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <h1 className="text-3xl font-extrabold text-slate-900">{title}</h1>
            <p className="mt-2 text-slate-600">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
      <Slideshow className="sticky top-0 hidden h-screen lg:block" slides={toSlides(slides, true)} label="Talent Connect highlights" scrimClassName="bg-gradient-to-t from-ink/85 via-ink/30 to-ink/10" interval={6000} />
    </div>
  );
}
