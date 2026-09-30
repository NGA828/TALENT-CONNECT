'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CreditCard, FileText, Paperclip, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime, formatMoney, humanize } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/lib/toast';
import type { PaymentConfig, PromoterProfile } from '@/lib/types';
import { Card, CardHeader, PageHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/form';
import { Alert, QueryState, SkeletonRows } from '@/components/ui/feedback';
import { StatusBadge } from '@/components/ui/badge';
import { PayLicenceModal } from '@/features/payments/pay-licence-modal';
import { SandboxBanner } from '@/features/payments/sandbox-banner';
import { useAuth } from '@/features/auth/auth-context';

const schema = z.object({
  licenceNumber: z.string().trim().min(3, 'Enter the licence number.').max(120),
  licenceAuthority: z.string().trim().min(2, 'Enter the issuing authority.').max(120),
  licenceExpiry: z.string().min(1, 'Enter the expiry date.').refine((v) => new Date(v).getTime() > Date.now(), 'The licence has already expired.'),
  licenceInfo: z.string().trim().max(800, 'Keep this under 800 characters.').optional(),
});
type Values = z.infer<typeof schema>;

export function LicencePage() {
  const profile = useApi<PromoterProfile>('/promoters/me');
  const config = useApi<PaymentConfig>('/payments/config');
  const [paying, setPaying] = useState(false);
  const { refresh } = useAuth();
  const reloadAll = () => { void profile.reload(); void refresh(); };

  return (
    <>
      <PageHeader title="Licence verification" description="Only verified promoters can publish events and issue contracts. Submit your licence, pay the verification fee and we will review it." />
      <QueryState state={profile} skeleton={<SkeletonRows rows={5} />}>
        {(p) => {
          const hasDetails = !!(p.licenceNumber && p.licenceAuthority && p.licenceExpiry);
          const steps = [
            { label: 'Licence details', done: hasDetails },
            { label: 'Verification fee', done: p.licenceFeePaid },
            { label: 'Admin review', done: p.licenceStatus === 'VERIFIED' },
          ];
          const editable = p.licenceStatus !== 'VERIFIED';
          return (
            <div className="space-y-6">
              <StatusBanner p={p} />
              <ol className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3" aria-label="Verification steps">
                {steps.map((s, i) => (
                  <li key={s.label} className={cn('flex items-center gap-3 rounded-xl border p-4', s.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white')}>
                    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', s.done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600')}>{s.done ? <Check className="size-4" /> : i + 1}</span>
                    <span className="text-sm font-semibold text-slate-900">{s.label}</span>
                  </li>
                ))}
              </ol>

              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                  <LicenceForm p={p} editable={editable} onSaved={reloadAll} />
                </div>
                <aside className="space-y-6">
                  <Card>
                    <CardHeader title="Verification fee" />
                    <div className="space-y-3 p-5">
                      {config.data && <SandboxBanner config={config.data} />}
                      <p className="font-display text-3xl font-extrabold text-slate-900">{config.data ? formatMoney(config.data.licenceFee, config.data.currency) : '—'}</p>
                      <p className="text-sm text-slate-600">One-time fee covering the manual review of your licence. It is not refunded if the licence is rejected, but you can resubmit without paying again.</p>
                      {p.licenceFeePaid ? <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><Check className="size-4" /> Fee paid</p> : <Button className="w-full" onClick={() => setPaying(true)}><CreditCard className="size-4" /> Pay verification fee</Button>}
                    </div>
                  </Card>
                  <Card>
                    <CardHeader title="Review history" />
                    {p.licenceHistory.length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No review activity yet.</p> : (
                      <ol className="space-y-4 p-5">
                        {p.licenceHistory.map((h) => (
                          <li key={h.id} className="relative border-l-2 border-slate-200 pl-4">
                            <p className="text-sm font-semibold text-slate-900">{humanize(h.action)}</p>
                            {h.reason && <p className="text-sm text-slate-600">{h.reason}</p>}
                            <p className="text-xs text-slate-400">{formatDateTime(h.createdAt)}{h.admin ? ` · ${h.admin}` : ''}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </Card>
                </aside>
              </div>
              <PayLicenceModal open={paying} onClose={() => setPaying(false)} onFinished={reloadAll} />
            </div>
          );
        }}
      </QueryState>
    </>
  );
}

function StatusBanner({ p }: { p: PromoterProfile }) {
  const hasDetails = !!(p.licenceNumber && p.licenceAuthority && p.licenceExpiry);
  if (p.licenceStatus === 'VERIFIED') return <Alert tone="success" title="Licence verified">Your agency was verified on {formatDate(p.licenceReviewedAt)}. You can publish events and issue contracts.</Alert>;
  if (p.licenceStatus === 'PENDING') return <Alert tone="info" title="Under review">Submitted {formatDate(p.licenceSubmittedAt)}. An administrator is reviewing your licence. You will be notified as soon as there is a decision.</Alert>;
  if (p.licenceStatus === 'REJECTED') return <Alert tone="danger" title="Licence rejected">{p.licenceRejectionReason ?? 'The licence could not be verified.'} Update your details below{p.licenceFeePaid ? ' and save to resubmit. You do not need to pay again' : ''}.</Alert>;
  return <Alert tone="warning" title="Not submitted yet">{!hasDetails ? 'Enter your licence details below. ' : ''}{!p.licenceFeePaid ? 'Then pay the verification fee. ' : ''}The review starts automatically once both are done.</Alert>;
}

function LicenceForm({ p, editable, onSaved }: { p: PromoterProfile; editable: boolean; onSaved: () => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { licenceNumber: p.licenceNumber ?? '', licenceAuthority: p.licenceAuthority ?? '', licenceExpiry: p.licenceExpiry ? p.licenceExpiry.slice(0, 10) : '', licenceInfo: p.licenceInfo ?? '' },
  });

  const pick = (f?: File) => {
    if (!f) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return toast.error('Upload a PDF, JPG, PNG or WebP file.');
    if (f.size > 10 * 1024 * 1024) return toast.error('The document must be 10 MB or smaller.');
    setFile(f);
  };

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    const form = new FormData();
    form.append('licenceNumber', v.licenceNumber);
    form.append('licenceAuthority', v.licenceAuthority);
    form.append('licenceExpiry', v.licenceExpiry);
    if (v.licenceInfo) form.append('licenceInfo', v.licenceInfo);
    if (file) form.append('document', file);
    try {
      await api.upload('POST', '/promoters/me/licence', form);
      toast.success('Licence details saved.');
      setFile(null);
      onSaved();
    } catch (err) {
      if (applyServerErrors(err, setError)) return setFormError('Please fix the highlighted fields.');
      setFormError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <Card>
        <CardHeader title="Licence details" action={<StatusBadge status={p.licenceStatus} />} />
        <div className="space-y-4 p-5">
          {formError && <Alert tone="danger">{formError}</Alert>}
          <fieldset disabled={!editable} className="space-y-4">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              <Input label="Licence number" required error={errors.licenceNumber?.message} {...register('licenceNumber')} />
              <Input label="Issuing authority" required placeholder="Authority shown on your Cameroon business licence" error={errors.licenceAuthority?.message} {...register('licenceAuthority')} />
            </div>
            <Input label="Expiry date" type="date" required error={errors.licenceExpiry?.message} {...register('licenceExpiry')} />
            <Textarea label="Additional information" rows={3} placeholder="Coverage area, licence category or anything the reviewer should know." error={errors.licenceInfo?.message} {...register('licenceInfo')} />
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-800">Supporting document</p>
              <input ref={fileRef} type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 p-3">
                <FileText className="size-5 text-slate-400" />
                <div className="min-w-0 flex-1 text-sm">
                  {file ? <span className="font-medium text-slate-900">{file.name}</span> : p.licenceDocumentUrl ? <a href={p.licenceDocumentUrl} target="_blank" rel="noreferrer" className="font-medium text-accent-700 hover:underline">View uploaded document</a> : <span className="text-slate-500">PDF or image, up to 10 MB</span>}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Paperclip className="size-4" /> {p.licenceDocumentUrl || file ? 'Replace' : 'Choose file'}</Button>
              </div>
            </div>
          </fieldset>
          {editable ? <div className="flex justify-end"><Button type="submit" loading={isSubmitting}><ShieldCheck className="size-4" /> {p.licenceStatus === 'REJECTED' ? 'Save and resubmit' : 'Save licence details'}</Button></div> : <p className="text-sm text-slate-500">Verified licences are locked. Contact support to change them.</p>}
        </div>
      </Card>
    </form>
  );
}
