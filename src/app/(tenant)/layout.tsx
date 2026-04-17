import '../globals.css';
import { Toaster } from 'sonner';
import { Suspense } from 'react';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster position="top-right" />
      <Suspense fallback={null}>{children}</Suspense>
    </>
  );
}
