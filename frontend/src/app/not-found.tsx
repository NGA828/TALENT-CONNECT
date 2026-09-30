import Link from 'next/link';
import { Brand } from '@/components/layout/brand';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50 px-6 text-center">
      <Brand />
      <p className="font-display text-6xl font-extrabold text-accent-600">404</p>
      <h1 className="text-xl font-bold">This page has left the stage</h1>
      <p className="max-w-md text-sm text-slate-600">The address may be mistyped or the page may have moved. Head back to the platform and try again.</p>
      <div className="flex gap-2">
        <ButtonLink href="/">Back to home</ButtonLink>
        <Link href="/login" className="inline-flex h-10 items-center px-4 text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</Link>
      </div>
    </div>
  );
}
