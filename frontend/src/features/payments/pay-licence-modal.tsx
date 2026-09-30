'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Clock, Copy, Paperclip } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/hooks';
import { formatMoney, normalizeCameroonPhone } from '@/lib/format';
import type { Payment, PaymentConfig, PaymentMethod, LicenceStatus } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Alert, Spinner } from '@/components/ui/feedback';
import { useToast } from '@/lib/toast';
import { cn } from '@/lib/cn';
import { MethodInstructions } from './mobile-money-banner';

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ''))
  .refine((v) => /^(\+?237|00237)?6\d{8}$/.test(v), 'Enter the Cameroonian number that sent the money, e.g. 677 12 34 56.');

const schema = z.object({
  method: z.enum(['MTN_MOMO', 'ORANGE_MONEY'], { message: 'Choose MTN Mobile Money or Orange Money.' }),
  payerName: z.string().trim().min(2, 'Enter the name on the Mobile Money wallet.').max(80),
  payerPhone: phone,
  transactionRef: z.string().trim().min(6, 'Copy the transaction ID from the Mobile Money SMS.').max(40),
});
type Values = z.infer<typeof schema>;

interface Result { payment: Payment; licence: { licenceStatus: LicenceStatus; licenceFeePaid: boolean } }

export function PayLicenceModal({ open, onClose, onFinished }: { open: boolean; onClose: () => void; onFinished: () => void }) {
  const toast = useToast();
  const [checkout, setCheckout] = useState<{ payment: Payment; config: PaymentConfig } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, control, setValue, reset, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { method: 'MTN_MOMO', payerName: '', payerPhone: '', transactionRef: '' },
  });
  const method = useWatch({ control, name: 'method' });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCheckout(null);
    setResult(null);
    setLoadError(null);
    setFormError(null);
    setReceipt(null);
    reset();
    api.post<{ payment: Payment; config: PaymentConfig }>('/payments/checkout', {})
      .then((r) => {
        if (cancelled) return;
        setCheckout(r);
        const enabled = r.config.methods.filter((m) => m.enabled);
        const preferred = enabled.find((m) => m.value === 'MTN_MOMO') ?? enabled[0];
        if (preferred) setValue('method', preferred.value as PaymentMethod as 'MTN_MOMO' | 'ORANGE_MONEY');
        if (r.config.suggestedPayerPhone) setValue('payerPhone', r.config.suggestedPayerPhone);
      })
      .catch((e) => !cancelled && setLoadError(errorMessage(e)));
    return () => { cancelled = true; };
  }, [open, reset, setValue]);

  const submit = handleSubmit(async (v) => {
    if (!checkout) return;
    setFormError(null);
    const form = new FormData();
    form.append('method', v.method);
    form.append('payerName', v.payerName);
    form.append('payerPhone', normalizeCameroonPhone(v.payerPhone));
    form.append('transactionRef', v.transactionRef);
    if (receipt) form.append('receipt', receipt);
    try {
      const res = await api.upload<Result>('POST', `/payments/${checkout.payment.id}/submit`, form);
      setResult(res);
      onFinished();
    } catch (err) {
      if (applyServerErrors(err, setError)) return;
      setFormError(errorMessage(err));
    }
  });

  const pick = (f?: File) => {
    if (!f) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return toast.error('Attach the receipt as a PDF, JPG, PNG or WebP file.');
    if (f.size > 10 * 1024 * 1024) return toast.error('The receipt must be 10 MB or smaller.');
    setReceipt(f);
  };

  const fee = checkout ? formatMoney(checkout.payment.amount, checkout.payment.currency) : '';
  const active = checkout?.config.methods.find((m) => m.value === method);
  const copyWallet = async () => {
    if (!active?.number) return;
    try {
      await navigator.clipboard.writeText(active.number.replace(/\s/g, ''));
      toast.success('Wallet number copied.');
    } catch {
      toast.error('Copy the number manually: ' + active.number);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Pay the licence fee" description="Mobile Money transfer — MTN MoMo or Orange Money.">
      {result ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
          <h3 className="mt-3 text-lg font-bold text-slate-900">
            {result.payment.status === 'SUCCESS' ? 'Licence fee confirmed' : 'Transfer submitted'}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {result.payment.status === 'SUCCESS'
              ? `${fee} was received on the platform's Mobile Money wallet.`
              : `We recorded your ${active?.shortLabel ?? 'Mobile Money'} transaction ${result.payment.transactionRef}. An administrator confirms it before your licence goes for review; you will be notified.`}
            {result.licence.licenceStatus === 'PENDING' ? ' Your licence is now with our team for review.' : ' Make sure your licence details are saved.'}
          </p>
          <Button className="mt-5" onClick={onClose}>Done</Button>
        </div>
      ) : loadError ? (
        <Alert tone="danger">{loadError}</Alert>
      ) : !checkout ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <p className="text-slate-600">Amount to send</p>
            <p className="font-display text-2xl font-extrabold text-slate-900">{fee}</p>
            <p className="mt-1 text-slate-600">
              Reference to quote: <span className="font-mono font-semibold text-slate-900">{checkout.payment.providerRef}</span>
            </p>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-800">Which wallet are you paying from?</legend>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
              {checkout.config.methods.map((m) => (
                <label key={m.value} className={cn('flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 text-sm transition-colors', m.enabled ? (method === m.value ? 'border-accent-600 bg-accent-50' : 'border-slate-200 hover:border-slate-300') : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60')}>
                  <span className="flex items-center gap-2">
                    <input type="radio" value={m.value} disabled={!m.enabled} className="size-4 accent-[var(--accent-600)]" {...register('method')} />
                    <span className="font-semibold text-slate-900">{m.label}</span>
                  </span>
                  <span className="pl-6 text-xs text-slate-500">{m.enabled ? <>Dial <span className="font-mono">{m.ussd}</span> · {m.number ?? 'wallet not set'}</> : 'Not available right now'}</span>
                </label>
              ))}
            </div>
            {errors.method && <p className="mt-1.5 text-[13px] text-red-600">{errors.method.message}</p>}
          </fieldset>

          {active && (
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">How to send with {active.shortLabel}</p>
                {active.number && <Button type="button" size="sm" variant="outline" onClick={copyWallet}><Copy className="size-3.5" /> Copy number</Button>}
              </div>
              <MethodInstructions method={active} fee={checkout.payment.amount} payeeName={checkout.config.payeeName} currency={checkout.payment.currency} />
              {checkout.config.instructions && <p className="mt-2 text-xs text-slate-500">{checkout.config.instructions}</p>}
            </div>
          )}

          {formError && <Alert tone="danger">{formError}</Alert>}
          <Input label="Wallet holder name" placeholder="Name registered on the Mobile Money account" required error={errors.payerName?.message} {...register('payerName')} />
          <Input label="Wallet number that sent the money" inputMode="tel" autoComplete="tel" placeholder="+237 677 12 34 56" required error={errors.payerPhone?.message} {...register('payerPhone')} />
          <Input label="Transaction ID" placeholder="MP2509.1234.A01923" required error={errors.transactionRef?.message} {...register('transactionRef')} hint="Copy it from the SMS receipt the operator sent you." />
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-800">Receipt screenshot (optional)</p>
            <input ref={fileRef} type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 p-3">
              <Paperclip className="size-4 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{receipt ? receipt.name : 'PDF or image, up to 10 MB — helps the administrator confirm faster.'}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>{receipt ? 'Replace' : 'Choose file'}</Button>
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}><Clock className="size-4" /> Submit transfer for confirmation</Button>
          <p className="text-center text-xs text-slate-500">The fee is confirmed by an administrator who holds the merchant wallet — never send money to any other number.</p>
        </form>
      )}
    </Modal>
  );
}
