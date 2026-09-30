'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarCheck, FileSignature, Megaphone, Menu, Search, Sparkles, UserPlus, X } from 'lucide-react';
import { Brand } from '@/components/layout/brand';
import { ButtonLink } from '@/components/ui/button';
import { Slideshow, type Slide } from '@/components/ui/slideshow';
import { homeFor, useAuth } from '@/features/auth/auth-context';
import { FeaturedTalents, LiveSection, LiveStats, ShowcaseGrid, Testimonials, UpcomingEvents, useLanding } from './landing-live';

const links = [
  { href: '#explore', label: 'Explore' },
  { href: '#how', label: 'How it works' },
  { href: '#talent', label: 'Talent' },
  { href: '#events', label: 'Events' },
  { href: '#trust', label: 'Trust' },
];

function Header() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">{l.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {!loading && user ? (
            <ButtonLink href={homeFor(user.role)}>Open my dashboard <ArrowRight className="size-4" /></ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">Login</ButtonLink>
              <ButtonLink href="/register">Get Started</ButtonLink>
            </>
          )}
        </div>
        <button onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="animate-fade-in border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{l.label}</a>
            ))}
          </nav>
          <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
            {!loading && user ? (
              <ButtonLink href={homeFor(user.role)} className="flex-1">Open my dashboard</ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="outline" className="flex-1">Login</ButtonLink>
                <ButtonLink href="/register" className="flex-1">Get Started</ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

const heroSlides: Slide[] = [
  { src: '/images/festival-crowd.jpg', alt: 'Festival crowd with hands raised under stage lights', caption: <HeroCaption title="Festival stages" text="Photographers, video crews and lighting designers" /> },
  { src: '/images/dj-club-set.jpg', alt: 'DJ performing a club set', caption: <HeroCaption title="Club nights" text="DJs, hosts and sound engineers" /> },
  { src: '/images/dancer-contemporary.jpg', alt: 'Contemporary dancer mid-movement', caption: <HeroCaption title="Stage and dance" text="Dancers, choreographers and performers" /> },
  { src: '/images/band-live-stage.jpg', alt: 'Live band performing on stage', caption: <HeroCaption title="Live music" text="Bands, musicians and session players" /> },
  { src: '/images/fashion-editorial.jpg', alt: 'Editorial fashion shoot', caption: <HeroCaption title="Fashion and brand launches" text="Models, makeup artists and stylists" /> },
  { src: '/images/mc-gala.jpg', alt: 'Host on stage at a gala dinner', caption: <HeroCaption title="Galas and corporate events" text="MCs, hosts and event crews" /> },
];

function HeroCaption({ title, text }: { title: string; text: string }) {
  return (
    <>
      <p className="text-sm font-bold">{title}</p>
      <p className="hidden text-xs text-slate-200 sm:block">{text}</p>
    </>
  );
}

function Hero() {
  return (
    <section>
      <Slideshow slides={heroSlides} label="Events and talent on Talent Connect" thumbnails interval={5500} scrimClassName="bg-gradient-to-r from-ink/90 via-ink/60 to-ink/15" className="min-h-[34rem] lg:min-h-[40rem]">
        <div className="mx-auto flex min-h-[34rem] max-w-7xl flex-col justify-center px-4 pb-24 pt-14 sm:px-6 lg:min-h-[40rem] lg:pb-28">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-800">
            <BadgeCheck className="size-4 text-emerald-600" aria-hidden /> Every promoter is licence-checked before they can book
          </p>
          <h1 className="mt-6 max-w-3xl text-[2.6rem] font-extrabold leading-[1.05] text-white sm:text-6xl">
            The right crew for <span className="text-accent-300">every night</span> on your calendar.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-200">
            Talent Connect puts photographers, DJs, dancers, hosts and stage crews in front of the promoters who hire them, with verified agencies, clear contracts and reviews from real bookings.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/register?role=talent" size="lg">Join as Talent</ButtonLink>
            <ButtonLink href="/register?role=promoter" size="lg" variant="outline" className="border-white bg-white text-slate-900 hover:bg-slate-100">Join as Promoter</ButtonLink>
            <a href="#explore" className="inline-flex h-12 items-center gap-2 px-3 text-base font-medium text-white hover:underline">
              Explore Platform <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </Slideshow>
      <div className="border-b border-slate-200 bg-[#fbf8f3]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><HeroStats /></div>
      </div>
    </section>
  );
}

function HeroStats() {
  const state = useLanding();
  return <LiveStats data={state.data?.stats} />;
}

function Audience() {
  return (
    <section id="explore" className="scroll-mt-16 bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent-700">One marketplace, two sides</p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">Whether you perform or produce, it starts here.</h2>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {[
            {
              id: 'talent',
              img: '/images/street-night.jpg',
              kicker: 'For talent',
              title: 'Be found for the work you are best at',
              points: ['A portfolio page with images, video, audio and documents', 'Browse and enrol in events from verified promoters', 'Read and answer contracts in one place — nothing is signed for you', 'An AI assistant to sharpen your bio and draft replies'],
              cta: 'Join as Talent',
              href: '/register?role=talent',
              dark: false,
            },
            {
              id: 'promoter',
              img: '/images/lighting-stage.jpg',
              kicker: 'For promoters',
              title: 'Hire people you can actually trust',
              points: ['Get your agency licence verified and earn the trust badge', 'Publish events and see who enrols in real time', 'Search talent by skill, rating and experience', 'Issue contracts and rate the work when it is done'],
              cta: 'Join as Promoter',
              href: '/register?role=promoter',
              dark: true,
            },
          ].map((c) => (
            <article key={c.id} className={`overflow-hidden rounded-3xl ${c.dark ? 'bg-ink text-white' : 'border border-slate-200 bg-[#fbf8f3] text-slate-900'}`}>
              <img src={c.img} alt="" loading="lazy" className="h-52 w-full object-cover" />
              <div className="p-7 sm:p-8">
                <p className={`text-xs font-bold uppercase tracking-wider ${c.dark ? 'text-teal-300' : 'text-accent-700'}`}>{c.kicker}</p>
                <h3 className="mt-2 text-2xl font-extrabold">{c.title}</h3>
                <ul className="mt-5 space-y-2.5">
                  {c.points.map((p) => (
                    <li key={p} className={`flex gap-3 text-[15px] leading-relaxed ${c.dark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <BadgeCheck className={`mt-0.5 size-5 shrink-0 ${c.dark ? 'text-teal-300' : 'text-accent-600'}`} aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  <Link href={c.href} className={`inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors ${c.dark ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-accent-600 text-white hover:bg-accent-700'}`}>
                    {c.cta} <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: UserPlus, title: 'Create your profile', body: 'Talents add their craft and portfolio. Promoters register their agency and submit a licence for review.' },
    { icon: Megaphone, title: 'Post or find events', body: 'Verified promoters publish events. Talents browse, filter by category and city, and enrol with a click.' },
    { icon: FileSignature, title: 'Agree in a contract', body: 'Promoters issue a contract for an enrolled talent. The talent reads the terms and accepts or declines.' },
    { icon: CalendarCheck, title: 'Deliver and review', body: 'After the event the promoter closes the contract and leaves a rating that builds the talent’s reputation.' },
  ];
  return (
    <section id="how" className="scroll-mt-16 bg-[#fbf8f3] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="max-w-xl text-3xl font-extrabold text-slate-900 sm:text-4xl">From first hello to five stars in four steps.</h2>
        <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-accent-600 shadow-xs ring-1 ring-slate-200"><s.icon className="size-6" /></span>
                <span className="font-display text-sm font-bold text-slate-400">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Live() {
  const state = useLanding();
  return (
    <>
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent-700">Top-rated talent</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">People promoters keep rebooking</h2>
            </div>
            <Link href="/register?role=promoter" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:underline">Search all talent <Search className="size-4" /></Link>
          </div>
          <LiveSection state={state} skeletonClass="h-96">{(d) => d.featuredTalents.length ? <FeaturedTalents data={d.featuredTalents} /> : <p className="text-slate-500">Talent profiles will appear here soon.</p>}</LiveSection>
        </div>
      </section>

      <section id="events" className="scroll-mt-16 bg-[#fbf8f3] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent-700">On the calendar</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">Upcoming events looking for talent</h2>
            </div>
            <Link href="/register?role=talent" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:underline">Join to enrol <ArrowRight className="size-4" /></Link>
          </div>
          <LiveSection state={state} skeletonClass="h-80">{(d) => d.upcomingEvents.length ? <UpcomingEvents data={d.upcomingEvents} /> : <p className="text-slate-500">New events are published every week.</p>}</LiveSection>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent-700">Work on show</p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">Portfolios that do the talking</h2>
          </div>
          <LiveSection state={state} skeletonClass="h-80">{(d) => d.showcase.length ? <ShowcaseGrid data={d.showcase} /> : <p className="text-slate-500">Portfolio highlights will appear here.</p>}</LiveSection>
        </div>
      </section>

      <section id="trust" className="scroll-mt-16 bg-ink py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent-300">Why it is safe to book here</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Verification is part of the product, not an afterthought.</h2>
              <ul className="mt-6 space-y-4 text-slate-300">
                {[
                  ['Licence review', 'Promoters submit their licence and pay a one-off verification fee. An admin reviews it before they can publish events or issue contracts.'],
                  ['Reviews from completed work', 'Only a promoter with a completed contract can rate a talent — ratings cannot be bought or faked.'],
                  ['You stay in control', 'Talents accept or decline every contract. Admins moderate portfolios and can suspend accounts.'],
                ].map(([t, b]) => (
                  <li key={t} className="flex gap-3">
                    <Sparkles className="mt-1 size-5 shrink-0 text-accent-300" aria-hidden />
                    <span><strong className="block text-white">{t}</strong>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <LiveSection state={state} skeletonClass="h-64">{(d) => <Testimonials data={d.testimonials} />}</LiveSection>
          </div>
        </div>
      </section>
    </>
  );
}

function FinalCta() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-5xl">Your next booking is one profile away.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">Create a free account in a minute. Talents pay nothing; promoters pay a single licence verification fee.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/register" size="lg">Get Started</ButtonLink>
          <ButtonLink href="/login" size="lg" variant="outline">Login</ButtonLink>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#fbf8f3]">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
        <div>
          <Brand />
          <p className="mt-2 max-w-xs text-sm text-slate-500">The marketplace for live talent and the promoters who book them.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          {links.map((l) => <a key={l.href} href={l.href} className="hover:text-slate-900">{l.label}</a>)}
          <Link href="/login" className="hover:text-slate-900">Login</Link>
          <Link href="/register" className="hover:text-slate-900">Register</Link>
        </nav>
      </div>
      <p className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} Talent Connect. All rights reserved.</p>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Audience />
        <HowItWorks />
        <Live />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
