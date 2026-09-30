'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Lock, XCircle } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/hooks';
import { formatMoney } from '@/lib/format';
import type { Payment, PaymentConfig, LicenceStatus } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Alert, Spinner } from '@/components/ui/feedback';
import { SandboxBanner } from './sandbox-banner';

const year = new Date().getFullYear();
const schema = z.object({
  cardholderName: z.string().trim().min(2, 'Enter the cardholder name.').max(80),
  cardNumber: z.string().refine((v) => /^\d{12,19}$/.test(v.replace(/[\s-]/g, '')), 'Enter a valid card number.'),
  expMonth: z.string().refine((v) => /^\d{1,2}$/.test(v) && +v >= 1 && +v <= 12, 'Month 1–12.'),
  expYear: z.string().refine((v) => /^\d{4}$/.test(v) && +v >= year && +v <= year + 20, `Year ${year}–${year + 20}.`),
  cvc: z.string().regex(/^\d{3,4}$/, '3 or 4 digits.'),
});
type Values = z.infer<typeof schema>;

interface Result { payment: Payment; licence: { licenceStatus: LicenceStatus; licenceFeePaid: boolean } }

export function PayLicenceModal({ open, onClose, onFinished }: { open: boolean; onClose: () => void; onFinished: () => void }) {
  const [checkout, setCheckout] = useState<{ payment: Payment; config: PaymentConfig } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const { register, handleSubmit, setValue, getValues, reset, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { cardholderName: '', cardNumber: '', expMonth: '', expYear: String(year + 2), cvc: '' },
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCheckout(null);
    setResult(null);
    setLoadError(null);
    setFormError(null);
    reset();
    api.post<{ payment: Payment; config: PaymentConfig }>('/payments/checkout', {})
      .then((r) => !cancelled && setCheckout(r))
      .catch((e) => !cancelled && setLoadError(errorMessage(e)));
    return () => { cancelled = true; };
  }, [open, reset]);

  const submit = handleSubmit(async (v) => {
    if (!checkout) return;
    setFormError(null);
    try {
      const res = await api.post<Result>(`/payments/${checkout.payment.id}/pay`, { ...v, cardNumber: v.cardNumber.replace(/[\s-]/g, ''), expMonth: Number(v.expMonth), expYear: Number(v.expYear) });
      setResult(res);
      onFinished();
    } catch (err) {
      if (applyServerErrors(err, setError)) return;
      setFormError(errorMessage(err));
    }
  });

  const fee = checkout ? formatMoney(checkout.payment.amount, checkout.payment.currency) : '';

  return (
    <Modal open={open} onClose={onClose} title="Pay licence fee" description="A one-time fee covers the verification review of your licence.">
      {result ? (
        <div className="py-4 text-center">
          {result.payment.status === 'SUCCESS' ? (
            <>
              <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
              <h3 className="mt-3 text-lg font-bold text-slate-900">Payment received</h3>
              <p className="mt-1 text-sm text-slate-600">{fee} was charged to the card ending {result.payment.cardLast4}. {result.licence.licenceStatus === 'PENDING' ? 'Your licence is now with our team for review.' : 'Submit your licence details to start the review.'}</p>
              <Button className="mt-5" onClick={onClose}>Done</Button>
            </>
          ) : (
            <>
              <XCircle className="mx-auto size-12 text-red-600" />
              <h3 className="mt-3 text-lg font-bold text-slate-900">Payment declined</h3>
              <p className="mt-1 text-sm text-slate-600">{result.payment.failureReason ?? 'The payment could not be completed.'}</p>
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button onClick={() => { setResult(null); setCheckout((c) => c && { ...c, payment: result.payment }); }}>Try another card</Button>
              </div>
            </>
          )}
        </div>
      ) : loadError ? (
        <Alert tone="danger">{loadError}</Alert>
      ) : !checkout ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <SandboxBanner config={checkout.config} />
          {checkout.config.sandbox && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-600">Test cards (click to fill)</p>
              <div className="flex flex-wrap gap-2">
                {checkout.config.testCards.map((c) => (
                  <button type="button" key={c.number} onClick={() => { setValue('cardNumber', c.number, { shouldValidate: true }); setValue('cvc', '123'); setValue('expMonth', '12'); if (!getValues('cardholderName')) setValue('cardholderName', 'Test Cardholder'); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-left text-xs hover:border-accent-600 hover:bg-accent-50">
                    <span className="block font-mono">{c.number}</span><span className="text-slate-500">{c.brand} · {c.outcome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {formError && <Alert tone="danger">{formError}</Alert>}
          <Input label="Cardholder name" autoComplete="cc-name" required error={errors.cardholderName?.message} {...register('cardholderName')} />
          <Input label="Card number" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" required error={errors.cardNumber?.message} {...register('cardNumber')} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Exp. month" inputMode="numeric" placeholder="MM" autoComplete="cc-exp-month" required error={errors.expMonth?.message} {...register('expMonth')} />
            <Input label="Exp. year" inputMode="numeric" placeholder="YYYY" autoComplete="cc-exp-year" required error={errors.expYear?.message} {...register('expYear')} />
            <Input label="CVC" inputMode="numeric" autoComplete="cc-csc" required error={errors.cvc?.message} {...register('cvc')} />
          </div>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}><Lock className="size-4" /> Pay {fee}</Button>
          <p className="text-center text-xs text-slate-500">Only the card brand and last four digits are stored.</p>
        </form>
      )}
    </Modal>
  );
}
