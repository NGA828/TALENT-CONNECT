'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Alert } from '@/components/ui/feedback';
import { ApiError } from '@/lib/api';
import { applyServerErrors, useHydrated } from '@/lib/hooks';
import { homeFor, useAuth } from './auth-context';
import { AuthLayout } from './auth-layout';

const schema = z.object({
  email: z.string().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const { login, user, loading } = useAuth();
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const destination = (role: Parameters<typeof homeFor>[0]) => {
    const area = role.toLowerCase();
    return next && next.startsWith(`/${area}`) ? next : homeFor(role);
  };

  useEffect(() => {
    if (!loading && user) router.replace(destination(user.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const u = await login(values.email, values.password);
      router.replace(destination(u.role));
    } catch (err) {
      if (applyServerErrors(err, setError)) return;
      if (err instanceof ApiError && err.status === 401) setFormError('That email and password combination is not correct.');
      else setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  });

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your bookings, events and messages.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {next && !formError && <Alert tone="info">Please sign in to continue.</Alert>}
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
        <div className="relative">
          <Input label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" error={errors.password?.message} className="pr-11" {...register('password')} />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-[30px] rounded p-1.5 text-slate-500 hover:text-slate-800">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={!hydrated}>Sign in</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New to Talent Connect? <Link href="/register" className="font-semibold text-accent-700 hover:underline">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
