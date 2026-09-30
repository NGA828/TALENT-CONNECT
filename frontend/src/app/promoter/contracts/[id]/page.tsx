import { ContractDetail } from '@/features/contracts/contract-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContractDetail id={id} role="PROMOTER" />;
}
