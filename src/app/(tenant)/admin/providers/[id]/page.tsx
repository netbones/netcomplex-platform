import { ProviderDetailView } from '@/components/admin/ProviderDetailView';

export default async function AdminProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProviderDetailView providerId={id} />;
}
