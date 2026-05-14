import { Suspense } from 'react';
import { Metadata } from 'next';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Authentication - Soralia Village',
  description: 'Sign in to your Soralia Village account',
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster position="top-right" />
      <Suspense fallback={null}>{children}</Suspense>
    </>
  );
}
