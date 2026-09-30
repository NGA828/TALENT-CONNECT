import { TalentDetailPage } from '@/features/promoter/talent-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TalentDetailPage id={id} />;
}
