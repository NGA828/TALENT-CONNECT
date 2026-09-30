import { EditEvent } from '@/features/events/edit-event';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditEvent id={id} />;
}
