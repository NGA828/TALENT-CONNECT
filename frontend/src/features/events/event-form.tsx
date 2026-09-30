'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, errorMessage } from '@/lib/api';
import { applyServerErrors } from '@/lib/hooks';
import { toLocalInput } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/lib/toast';
import type { EventItem, PublicMeta } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select, Textarea } from '@/components/ui/form';
import { Alert } from '@/components/ui/feedback';

const schema = z.object({
  title: z.string().trim().min(3, 'Give the event a title of at least 3 characters.').max(120),
  category: z.string().min(1, 'Choose a category.'),
  talentNeeded: z.string().optional(),
  location: z.string().trim().min(2, 'Enter the venue or city.').max(160),
  eventDate: z.string().min(1, 'Choose the date and time.').refine((v) => new Date(`${v}:00+01:00`).getTime() > Date.now(), 'The event must be in the future.'),
  budget: z.string().trim().max(80).optional(),
  description: z.string().trim().min(30, 'Describe the event in at least 30 characters so talent know what to expect.').max(4000),
});
type Values = z.infer<typeof schema>;

export function EventForm({ existing }: { existing?: EventItem }) {
  const router = useRouter();
  const toast = useToast();
  const meta = useApi<PublicMeta>('/public/meta');
  const [formError, setFormError] = useState<string | null>(null);
  const [intent, setIntent] = useState<'draft' | 'publish'>('draft');
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: existing?.title ?? '',
      category: existing?.category ?? '',
      talentNeeded: existing?.talentNeeded ?? '',
      location: existing?.location ?? '',
      eventDate: toLocalInput(existing?.eventDate),
      budget: existing?.budget ?? '',
      description: existing?.description ?? '',
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const body = { ...v, eventDate: new Date(`${v.eventDate}:00+01:00`).toISOString(), talentNeeded: v.talentNeeded || undefined, budget: v.budget || undefined };
    try {
      if (existing) {
        await api.patch(`/events/${existing.id}`, body);
        toast.success('Event updated.');
        router.replace(`/promoter/events/${existing.id}`);
      } else {
        const created = await api.post<EventItem>('/events', { ...body, publish: intent === 'publish' });
        toast.success(intent === 'publish' ? 'Event published — talent can now enrol.' : 'Draft saved.');
        router.replace(`/promoter/events/${created.id}`);
      }
    } catch (err) {
      if (applyServerErrors(err, setError)) {
        setFormError('Please fix the highlighted fields.');
        return;
      }
      setFormError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="space-y-5 p-6">
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Input label="Event title" required placeholder="Harbour Lights Charity Gala" error={errors.title?.message} {...register('title')} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
          <Select label="Category" required error={errors.category?.message} {...register('category')}>
            <option value="">Select…</option>
            {meta.data?.eventCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label="Talent needed" hint="Optional — helps the right people find it." {...register('talentNeeded')}>
            <option value="">Open to all</option>
            {meta.data?.specializations.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
          <Input label="Venue / city" required placeholder="Bonanjo, Douala" error={errors.location?.message} {...register('location')} />
          <Input label="Date and time (Cameroon, UTC+1)" type="datetime-local" required error={errors.eventDate?.message} {...register('eventDate')} />
        </div>
        <Input label="Budget" placeholder="150,000 – 300,000 FCFA" hint="Free text, shown to talent. Leave blank for “to be confirmed”." error={errors.budget?.message} {...register('budget')} />
        <Textarea label="Description" required rows={7} placeholder="What is the event, who attends, what will the talent be doing, and what do you expect from them?" error={errors.description?.message} {...register('description')} />
      </Card>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        {existing ? (
          <Button type="submit" loading={isSubmitting}>Save changes</Button>
        ) : (
          <>
            <Button type="submit" variant="outline" loading={isSubmitting && intent === 'draft'} onClick={() => setIntent('draft')}>Save as draft</Button>
            <Button type="submit" loading={isSubmitting && intent === 'publish'} onClick={() => setIntent('publish')}>Publish event</Button>
          </>
        )}
      </div>
    </form>
  );
}
