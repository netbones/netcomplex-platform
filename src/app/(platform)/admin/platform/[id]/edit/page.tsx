import { TenantBrandingPage } from '@pages/admin';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: Props) {
  return <TenantBrandingPage params={params} />;
}
