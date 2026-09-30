import { PageHeader } from '@/components/ui/card';
import { EventForm } from '@/features/events/event-form';
import { CreateEventGuard } from '@/features/events/create-event-guard';

export default function Page() {
  return (
    <>
      <PageHeader title="Create event" description="Describe the event and the talent you need. Save a draft, or publish straight away once your agency is verified." />
      <CreateEventGuard>
        <EventForm />
      </CreateEventGuard>
    </>
  );
}
