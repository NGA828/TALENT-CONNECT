import { AdminPromoterDetailPage } from '@/features/admin/promoter-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPromoterDetailPage id={id} />;
}
