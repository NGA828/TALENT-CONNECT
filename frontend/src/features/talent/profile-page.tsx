'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Circle } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/hooks';
import { humanize } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/lib/toast';
import type { PublicMeta, TalentProfile } from '@/lib/types';
import { Card, CardHeader, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/form';
import { Alert, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { AvatarUploader, ChangePasswordCard } from '@/features/auth/account-cards';
import { useAuth } from '@/features/auth/auth-context';
import { CompletionRing } from './completion-ring';
import { TagInput } from './tag-input';

const schema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(60),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(60),
  phone: z.string().trim().regex(/^\+?[0-9()\-\s]{7,20}$/, 'Enter a valid phone number.'),
  gender: z.string().min(1, 'Select an option.'),
  specialization: z.string().min(1, 'Choose your specialization.'),
  location: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000, 'Keep your bio under 2,000 characters.').optional(),
  experienceYears: z.string().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 60), 'Enter whole years between 0 and 60.'),
  website: z.string().trim().max(200).optional().refine((v) => !v || /^https?:\/\/.+\..+/.test(v), 'Enter a full link starting with http:// or https://'),
  skills: z.array(z.string()),
});
type Values = z.infer<typeof schema>;

export function TalentProfilePage() {
  const state = useApi<TalentProfile>('/talents/me');
  return (
    <>
      <PageHeader title="My profile" description="This is what promoters see when they search for talent. A complete profile is found more often." />
      <QueryState state={state} skeleton={<SkeletonRows rows={5} />}>{(p) => <ProfileForm profile={p} onSaved={() => void state.reload()} />}</QueryState>
    </>
  );
}

function ProfileForm({ profile, onSaved }: { profile: TalentProfile; onSaved: () => void }) {
  const toast = useToast();
  const { refresh } = useAuth();
  const meta = useApi<PublicMeta>('/public/meta');
  const [formError, setFormError] = useState<string | null>(null);
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? '',
      gender: profile.gender,
      specialization: profile.specialization,
      location: profile.location ?? '',
      bio: profile.bio ?? '',
      experienceYears: String(profile.experienceYears ?? 0),
      website: profile.website ?? '',
      skills: profile.skills,
    },
  });

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await api.patch('/talents/me', { ...v, experienceYears: v.experienceYears === '' ? 0 : Number(v.experienceYears), location: v.location ?? '', bio: v.bio ?? '', website: v.website ?? '' });
      await refresh();
      toast.success('Profile saved.');
      onSaved();
    } catch (err) {
      if (applyServerErrors(err, setError)) {
        setFormError('Please fix the highlighted fields.');
        return;
      }
      setFormError(errorMessage(err));
    }
  });

  const completion = profile.completion;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <form onSubmit={submit} noValidate>
          <Card>
            <CardHeader title="Profile details" />
            <div className="space-y-5 p-5">
              {formError && <Alert tone="danger">{formError}</Alert>}
              <AvatarUploader />
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Input label="First name" required error={errors.firstName?.message} {...register('firstName')} />
                <Input label="Last name" required error={errors.lastName?.message} {...register('lastName')} />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Input label="Email" value={profile.email ?? ''} disabled readOnly hint="Your sign-in email cannot be changed." />
                <Input label="Phone" type="tel" required error={errors.phone?.message} {...register('phone')} />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Select label="Specialization" required error={errors.specialization?.message} {...register('specialization')}>
                  {(meta.data?.specializations ?? [profile.specialization]).map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Select label="Gender" required error={errors.gender?.message} {...register('gender')}>
                  {(meta.data?.genders ?? [profile.gender]).map((g) => <option key={g} value={g}>{humanize(g)}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <Input label="Location" placeholder="Douala, Cameroon" error={errors.location?.message} {...register('location')} />
                <Input label="Years of experience" type="number" min={0} max={60} error={errors.experienceYears?.message} {...register('experienceYears')} />
              </div>
              <Textarea label="Bio" rows={6} placeholder="Tell promoters who you are, what you shoot / play / run, and what makes you reliable." hint="Not sure how to start? Try the AI assistant in the sidebar." error={errors.bio?.message} {...register('bio')} />
              <Controller control={control} name="skills" render={({ field }) => <TagInput label="Skills" value={field.value} onChange={(v) => field.onChange(v)} />} />
              <Input label="Website or portfolio link" placeholder="https://" error={errors.website?.message} {...register('website')} />
              <div className="flex justify-end"><Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save profile</Button></div>
            </div>
          </Card>
        </form>
        <ChangePasswordCard />
      </div>

      <aside className="space-y-6">
        {completion && (
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <CompletionRing percent={completion.percent} />
              <div><p className="font-semibold text-slate-900">Profile strength</p><p className="text-sm text-slate-500">{completion.percent === 100 ? 'Looking great!' : 'Finish the steps below'}</p></div>
            </div>
            <ul className="mt-5 space-y-2.5">
              {completion.items.map((i) => (
                <li key={i.key} className="flex items-center gap-2.5 text-sm">
                  {i.done ? <CheckCircle2 className="size-[18px] text-emerald-600" /> : <Circle className="size-[18px] text-slate-300" />}
                  <span className={i.done ? 'text-slate-500 line-through' : 'text-slate-800'}>{i.label}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </aside>
    </div>
  );
}
