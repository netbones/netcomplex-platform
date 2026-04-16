import { TenantFeaturePage } from '@pages/admin';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  return <TenantFeaturePage params={params} />;
}
