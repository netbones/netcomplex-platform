import { Suspense } from 'react';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Authentication - Soralia Village',
  description: 'Sign in to your Soralia Village account',
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
