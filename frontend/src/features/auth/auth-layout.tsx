import type { ReactNode } from 'react';
import { Brand } from '@/components/layout/brand';

export function AuthLayout({ title, subtitle, children, image = '/images/band-live-stage.jpg', quote }: { title: string; subtitle: string; children: ReactNode; image?: string; quote?: { text: string; by: string } }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col bg-white px-4 py-8 sm:px-10">
        <Brand />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold text-slate-900">{title}</h1>
          <p className="mt-2 text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-ink lg:block">
        <img src={image} alt="" className="absolute inset-0 size-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-ink/50" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <p className="max-w-md text-2xl font-bold leading-snug">{quote?.text ?? 'Where live talent meets the people who book it.'}</p>
          <p className="mt-3 text-sm text-slate-300">{quote?.by ?? 'Talent Connect'}</p>
        </div>
      </aside>
    </div>
  );
}
