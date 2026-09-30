'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { formatMoney } from '@/lib/format';
import type { Contract } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/form';
import { Alert } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/modal';
import { StarInput } from '@/components/ui/rating';

/** Contracts on Talent Connect are always paid in Central African CFA francs (XAF). */

const schema = z.object({
  terms: z.string().trim().min(20, 'Describe the contract terms in at least 20 characters.').max(6000, 'Keep the terms under 6,000 characters.'),
  amount: z.string().trim().regex(/^\d*$/, 'Enter the fee as a whole number of FCFA (no decimals or symbols).').refine((v) => v === '' || Number(v) <= 100_000_000, 'The fee cannot exceed 100,000,000 FCFA.'),
  reviewNotes: z.string().trim().max(1500).optional(),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (contract: Contract) => void;
  /** Provide for create mode. */
  create?: { talentId: string; eventId: string; talentName: string; eventTitle: string };
  /** Provide for edit mode. */
  existing?: Contract;
}

export function ContractFormModal({ open, onClose, onSaved, create, existing }: Props) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, reset, control, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    values: { terms: existing?.terms ?? '', amount: existing?.amount != null ? Math.round(existing.amount).toString() : '', reviewNotes: existing?.reviewNotes ?? '' },
  });
  const amount = useWatch({ control, name: 'amount' });
  const feePreview = amount && /^\d+$/.test(amount) ? formatMoney(Number(amount)) : null;

  const submit = handleSubmit(async (v) => {
    setFormError(null);
    const body = { terms: v.terms, amount: v.amount === '' ? undefined : Number(v.amount), currency: 'XAF', reviewNotes: v.reviewNotes || undefined };
    try {
      const saved = existing
        ? await api.patch<Contract>(`/contracts/${existing.id}`, { terms: body.terms, amount: body.amount, reviewNotes: body.reviewNotes })
        : await api.post<Contract>('/contracts', { ...body, talentId: create!.talentId, eventId: create!.eventId });
      toast.success(existing ? 'Contract updated.' : `Contract sent to ${create!.talentName}.`);
      reset();
      onSaved(saved);
    } catch (err) {
      if (applyServerErrors(err, setError)) return;
      setFormError(errorMessage(err));
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={existing ? 'Edit contract' : 'Issue a contract'}
      description={existing ? existing.event.title : create ? `${create.talentName} · ${create.eventTitle}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={isSubmitting}>{existing ? 'Save changes' : 'Send contract'}</Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Textarea label="Terms" required rows={7} placeholder="Call time, duration, deliverables, overtime, cancellation policy, payment schedule…" error={errors.terms?.message} {...register('terms')} />
        <Input
          label="Fee"
          type="number"
          inputMode="numeric"
          step={1000}
          min={0}
          placeholder="e.g. 350000"
          suffix="FCFA"
          hint={feePreview ? `Talent will see: ${feePreview}` : 'Central African CFA francs (XAF), whole amounts only. Leave blank to agree the fee later.'}
          error={errors.amount?.message}
          {...register('amount')}
        />
        <Textarea label="Notes for the talent (optional)" rows={3} error={errors.reviewNotes?.message} {...register('reviewNotes')} />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export function RateTalentModal({ open, onClose, contract, onRated }: { open: boolean; onClose: () => void; contract: Contract; onRated: () => void }) {
  const toast = useToast();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (score < 1) {
      setError('Choose a star rating from 1 to 5.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/ratings', { contractId: contract.id, score, comment: comment.trim() || undefined });
      toast.success('Thanks — your rating has been published.');
      onRated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Rate ${contract.talent.firstName} ${contract.talent.lastName}`} description={contract.event.title} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy}>Publish rating</Button></>}>
      <div className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-800">Overall score</p>
          <StarInput value={score} onChange={setScore} />
        </div>
        <Textarea label="Comment (optional)" rows={4} maxLength={800} placeholder="How was the collaboration? Punctuality, professionalism, quality of work…" value={comment} onChange={(e) => setComment(e.target.value)} hint="Your review is public on the talent’s profile." />
      </div>
    </Modal>
  );
}

export function RespondModal({ open, onClose, contract, decision, onDone }: { open: boolean; onClose: () => void; contract: Contract; decision: 'ACCEPT' | 'REJECT'; onDone: (c: Contract) => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const accept = decision === 'ACCEPT';

  const submit = async () => {
    if (!accept && note.trim().length < 3) {
      setError('Please add a short note explaining why you are declining.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await api.post<Contract>(`/contracts/${contract.id}/respond`, { decision, note: note.trim() || undefined });
      toast.success(accept ? 'Contract accepted. Good luck with the event!' : 'Contract declined.');
      onDone(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title={accept ? 'Accept this contract?' : 'Decline this contract?'} description={contract.event.title} footer={<><Button variant="outline" onClick={onClose}>Back</Button><Button variant={accept ? 'primary' : 'danger'} onClick={submit} loading={busy}>{accept ? 'Accept contract' : 'Decline contract'}</Button></>}>
      <div className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <p className="text-sm leading-relaxed text-slate-600">
          {accept ? `By accepting you agree to the terms set by ${contract.promoter.agencyName}. The promoter will be notified straight away.` : `${contract.promoter.agencyName} will be told that you declined. This cannot be undone.`}
        </p>
        <Textarea label={accept ? 'Message to the promoter (optional)' : 'Reason for declining'} required={!accept} rows={4} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}
