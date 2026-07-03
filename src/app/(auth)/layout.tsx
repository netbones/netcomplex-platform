import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getCurrentTenant } from '@entities/tenant/server';

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  const name = tenant?.name || 'Netcomplex';
  return {
    title: `Authentication - ${name}`,
    description: `Sign in to your ${name} account`,
  };
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
