'use client';

import type { ReactNode } from 'react';
import { useApi } from '@/lib/use-api';
import type { PromoterProfile } from '@/lib/types';
import { Alert } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';

/** Drafts can be saved by anyone; this just explains up-front why publishing needs a verified licence. */
export function CreateEventGuard({ children }: { children: ReactNode }) {
  const { data } = useApi<PromoterProfile>('/promoters/me');
  return (
    <>
      {data && data.licenceStatus !== 'VERIFIED' && (
        <Alert tone="warning" title="Your agency is not verified yet" className="mb-5">
          You can save drafts now, but events can only be published once an administrator has verified your licence.
          <div className="mt-2"><ButtonLink href="/promoter/licence" size="sm" variant="outline">Go to licence verification</ButtonLink></div>
        </Alert>
      )}
      {children}
    </>
  );
}
