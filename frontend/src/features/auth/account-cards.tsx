'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Alert } from '@/components/ui/feedback';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from './auth-context';

export function AvatarUploader() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file (JPG, PNG, GIF or WebP).');
    if (file.size > 10 * 1024 * 1024) return toast.error('Profile photos can be up to 10 MB.');
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    try {
      await api.upload('POST', '/users/me/avatar', form);
      await refresh();
      toast.success('Profile photo updated.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar firstName={user.firstName} lastName={user.lastName} src={user.avatarUrl} size={80} />
      <div>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
        <Button variant="outline" size="sm" loading={busy} onClick={() => ref.current?.click()}><Camera className="size-4" /> Change photo</Button>
        <p className="mt-1.5 text-xs text-slate-500">JPG, PNG, GIF or WebP up to 10 MB.</p>
      </div>
    </div>
  );
}

const pwSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/, 'Use 8–72 characters with an uppercase letter, a lowercase letter and a number.'),
    confirm: z.string().min(1, 'Confirm the new password.'),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match.' });
type PwValues = z.infer<typeof pwSchema>;

export function ChangePasswordCard() {
  const toast = useToast();
  const { login, user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<PwValues>({ resolver: zodResolver(pwSchema) });

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await api.patch('/users/me/password', { currentPassword: v.currentPassword, newPassword: v.newPassword }, { silent401: true });
      // Changing the password invalidates old tokens server-side, so sign in again silently to keep this session.
      if (user) await login(user.email, v.newPassword);
      toast.success('Password changed.');
      reset();
    } catch (err) {
      if (applyServerErrors(err, setError)) return;
      setFormError(errorMessage(err));
    }
  });

  return (
    <Card>
      <CardHeader title="Password" description="Choose a strong password you do not use anywhere else." />
      <form onSubmit={submit} noValidate className="space-y-4 p-5">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Input label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <Input label="New password" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword')} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
        </div>
        <Button type="submit" loading={isSubmitting}>Update password</Button>
      </form>
    </Card>
  );
}
