import { Suspense } from 'react';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NetComplex Platform',
  description: 'Multi-tenant property management platform',
};

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
