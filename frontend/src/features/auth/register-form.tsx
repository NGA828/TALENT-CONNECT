'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/form';
import { Alert } from '@/components/ui/feedback';
import { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/hooks';
import { humanize } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import type { PublicMeta } from '@/lib/types';
import { cn } from '@/lib/cn';
import { homeFor, useAuth } from './auth-context';
import { AuthLayout, PROMOTER_SLIDES, TALENT_SLIDES } from './auth-layout';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
const PHONE_RULE = /^\+?[0-9()\-\s]{7,20}$/;

const base = {
  firstName: z.string().trim().min(1, 'Enter your first name.').max(60),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(60),
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  phone: z.string().trim().regex(PHONE_RULE, 'Enter a valid phone number, e.g. +1 212 555 0100.'),
  password: z.string().regex(PASSWORD_RULE, 'Use 8–72 characters with an uppercase letter, a lowercase letter and a number.'),
  confirmPassword: z.string().min(1, 'Please confirm your password.'),
};
const matchPasswords = (v: { password: string; confirmPassword: string }, ctx: z.RefinementCtx) => {
  if (v.password !== v.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match.' });
};

const talentSchema = z.object({ ...base, gender: z.string().min(1, 'Select an option.'), specialization: z.string().min(1, 'Choose your specialization.') }).superRefine(matchPasswords);
const promoterSchema = z
  .object({ ...base, agencyName: z.string().trim().min(2, 'Enter your agency name.').max(120), licenceNumber: z.string().trim().min(3, 'Enter your licence number.').max(60), licenceInfo: z.string().trim().max(1000).optional() })
  .superRefine(matchPasswords);

type TalentValues = z.infer<typeof talentSchema>;
type PromoterValues = z.infer<typeof promoterSchema>;

const FALLBACK_META: PublicMeta = { specializations: [], genders: ['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'], eventCategories: [], licenceFee: 0, currency: 'USD' };

export function RegisterForm() {
  const params = useSearchParams();
  const initial = params.get('role') === 'promoter' ? 'promoter' : 'talent';
  const [role, setRole] = useState<'talent' | 'promoter'>(initial);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user.role));
  }, [loading, user, router]);

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Choose how you will use Talent Connect. You can always reach us if you picked the wrong one."
      slides={role === 'talent' ? TALENT_SLIDES : PROMOTER_SLIDES}
    >
      <div role="tablist" aria-label="Account type" className="mb-7 grid grid-cols-2 gap-3">
        {([
          { v: 'talent', label: 'I am talent', hint: 'Find events and get booked', Icon: Camera },
          { v: 'promoter', label: 'I am a promoter', hint: 'Hire verified talent', Icon: Megaphone },
        ] as const).map(({ v, label, hint, Icon }) => (
          <button key={v} role="tab" type="button" aria-selected={role === v} onClick={() => setRole(v)} className={cn('rounded-xl border p-3.5 text-left transition-colors', role === v ? 'border-accent-600 bg-accent-50 ring-1 ring-accent-600' : 'border-slate-300 bg-white hover:border-slate-400')}>
            <Icon className={cn('size-5', role === v ? 'text-accent-600' : 'text-slate-400')} aria-hidden />
            <span className="mt-2 block text-sm font-semibold text-slate-900">{label}</span>
            <span className="block text-xs text-slate-500">{hint}</span>
          </button>
        ))}
      </div>
      {role === 'talent' ? <TalentForm key="t" /> : <PromoterForm key="p" />}
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account? <Link href="/login" className="font-semibold text-accent-700 hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}

function CommonFields({ register, errors }: { register: ReturnType<typeof useForm<TalentValues & PromoterValues>>['register']; errors: Record<string, { message?: string } | undefined> }) {
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <Input label="First name" autoComplete="given-name" required error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Last name" autoComplete="family-name" required error={errors.lastName?.message} {...register('lastName')} />
      </div>
      <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
      <Input label="Phone" type="tel" autoComplete="tel" placeholder="+1 212 555 0100" required error={errors.phone?.message} {...register('phone')} />
    </>
  );
}

function PasswordFields({ register, errors }: { register: ReturnType<typeof useForm<TalentValues & PromoterValues>>['register']; errors: Record<string, { message?: string } | undefined> }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <Input label="Password" type="password" autoComplete="new-password" required hint="8+ characters, upper & lower case, a number." error={errors.password?.message} {...register('password')} />
      <Input label="Confirm password" type="password" autoComplete="new-password" required error={errors.confirmPassword?.message} {...register('confirmPassword')} />
    </div>
  );
}

function useSubmit(role: 'talent' | 'promoter') {
  const { register: signUp } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const submit = async (values: Record<string, unknown>, setError: Parameters<typeof applyServerErrors>[1]) => {
    setFormError(null);
    try {
      const u = await signUp(role, values);
      router.replace(homeFor(u.role));
    } catch (err) {
      if (applyServerErrors(err, setError)) {
        setFormError('Please fix the highlighted fields and try again.');
        return;
      }
      setFormError(err instanceof ApiError ? (err.status === 409 ? 'An account with this email already exists. Try signing in instead.' : err.message) : 'Something went wrong. Please try again.');
    }
  };
  return { formError, submit };
}

function TalentForm() {
  const meta = useApi<PublicMeta>('/public/meta');
  const { formError, submit } = useSubmit('talent');
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<TalentValues>({ resolver: zodResolver(talentSchema), defaultValues: { gender: '', specialization: '' } });
  const m = meta.data ?? FALLBACK_META;
  return (
    <form onSubmit={handleSubmit((v) => submit(v, setError as never))} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <CommonFields register={register as never} errors={errors as never} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <Select label="Gender" required error={errors.gender?.message} {...register('gender')}>
          <option value="">Select…</option>
          {m.genders.map((g) => <option key={g} value={g}>{humanize(g)}</option>)}
        </Select>
        <Select label="Specialization" required error={errors.specialization?.message} hint={meta.error ? 'Could not load the list — please reload.' : undefined} {...register('specialization')}>
          <option value="">Select…</option>
          {m.specializations.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <PasswordFields register={register as never} errors={errors as never} />
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Create talent account</Button>
    </form>
  );
}

function PromoterForm() {
  const { formError, submit } = useSubmit('promoter');
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<PromoterValues>({ resolver: zodResolver(promoterSchema) });
  return (
    <form onSubmit={handleSubmit((v) => submit({ ...v, licenceInfo: v.licenceInfo || undefined }, setError as never))} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <CommonFields register={register as never} errors={errors as never} />
      <Input label="Agency name" required error={errors.agencyName?.message} {...register('agencyName')} />
      <Input label="Licence number" required hint="You can upload the licence document and pay the verification fee after signing up." error={errors.licenceNumber?.message} {...register('licenceNumber')} />
      <Textarea label="Licence information" rows={3} placeholder="Issuing authority, licence type, expiry date…" error={errors.licenceInfo?.message} {...register('licenceInfo')} />
      <PasswordFields register={register as never} errors={errors as never} />
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Create promoter account</Button>
    </form>
  );
}
