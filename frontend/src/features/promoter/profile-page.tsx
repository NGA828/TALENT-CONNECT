'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/hooks';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/lib/toast';
import type { PromoterProfile } from '@/lib/types';
import { Card, CardHeader, PageHeader } from '@/components/ui/card';
import { Button, ButtonLink } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/form';
import { Alert, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { StatusBadge } from '@/components/ui/badge';
import { AvatarUploader, ChangePasswordCard } from '@/features/auth/account-cards';
import { useAuth } from '@/features/auth/auth-context';

const schema = z.object({
  firstName: z.string().trim().min(2, 'Enter your first name.').max(50),
  lastName: z.string().trim().min(2, 'Enter your last name.').max(50),
  phone: z.string().trim().regex(/^\+?[0-9()\-\s]{7,20}$/, 'Enter a valid phone number.'),
  agencyName: z.string().trim().min(2, 'Enter the agency name.').max(100),
  agencyDescription: z.string().trim().max(1500, 'Keep this under 1,500 characters.').optional(),
  website: z.string().trim().max(200).optional().refine((v) => !v || /^https?:\/\/.+\..+/.test(v), 'Enter a full link starting with https://'),
  location: z.string().trim().max(100).optional(),
});
type Values = z.infer<typeof schema>;

export function PromoterProfilePage() {
  const state = useApi<PromoterProfile>('/promoters/me');
  return (
    <>
      <PageHeader title="Agency profile" description="Talent sees this information on your events and contracts." />
      <QueryState state={state} skeleton={<SkeletonRows rows={5} />}>{(p) => <Form p={p} onSaved={() => void state.reload()} />}</QueryState>
    </>
  );
}

function Form({ p, onSaved }: { p: PromoterProfile; onSaved: () => void }) {
  const toast = useToast();
  const { refresh } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: p.user.firstName, lastName: p.user.lastName, phone: p.user.phone ?? '', agencyName: p.agencyName, agencyDescription: p.agencyDescription ?? '', website: p.website ?? '', location: p.location ?? '' },
  });
  const submit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await api.patch('/promoters/me', { ...v, agencyDescription: v.agencyDescription ?? '', website: v.website ?? '', location: v.location ?? '' });
      await refresh();
      toast.success('Profile saved.');
      onSaved();
    } catch (err) {
      if (applyServerErrors(err, setError)) return setFormError('Please fix the highlighted fields.');
      setFormError(errorMessage(err));
    }
  });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <form onSubmit={submit} noValidate>
          <Card>
            <CardHeader title="Agency and contact" />
            <div className="space-y-5 p-5">
              {formError && <Alert tone="danger">{formError}</Alert>}
              <AvatarUploader />
              <Input label="Agency name" required error={errors.agencyName?.message} {...register('agencyName')} />
              <Textarea label="About the agency" rows={5} placeholder="What kind of events do you produce and what do you look for in talent?" error={errors.agencyDescription?.message} {...register('agencyDescription')} />
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Input label="Location" placeholder="City, country" error={errors.location?.message} {...register('location')} />
                <Input label="Website" placeholder="https://" error={errors.website?.message} {...register('website')} />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Input label="First name" required error={errors.firstName?.message} {...register('firstName')} />
                <Input label="Last name" required error={errors.lastName?.message} {...register('lastName')} />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Input label="Email" value={p.user.email} disabled readOnly hint="Your sign-in email cannot be changed." />
                <Input label="Phone" type="tel" required error={errors.phone?.message} {...register('phone')} />
              </div>
              <div className="flex justify-end"><Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save profile</Button></div>
            </div>
          </Card>
        </form>
        <ChangePasswordCard />
      </div>
      <aside>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900">Licence</p>
          <div className="mt-2 flex items-center gap-2"><StatusBadge status={p.licenceStatus} /><span className="text-sm text-slate-500">{p.licenceFeePaid ? 'Fee paid' : 'Fee unpaid'}</span></div>
          <p className="mt-2 text-sm text-slate-600">{p.licenceStatus === 'VERIFIED' ? 'Your agency is verified and can publish events.' : 'Complete verification to publish events and issue contracts.'}</p>
          <ButtonLink href="/promoter/licence" variant="outline" size="sm" className="mt-3">Manage licence</ButtonLink>
        </Card>
      </aside>
    </div>
  );
}
