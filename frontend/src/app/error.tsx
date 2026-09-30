'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Logged for developers only – users never see the stack trace.
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-sm text-slate-600">An unexpected error interrupted this page. Your data is safe. Try again, and if the problem continues, reload the page.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
