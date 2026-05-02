import '../globals.css';
import { Toaster } from 'sonner';
import { Suspense } from 'react';
import { Header } from '@shared/ui/Header';
import { Footer } from '@shared/ui/Footer';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Toaster position="top-right" />
      <Header />
      <Suspense fallback={null}>{children}</Suspense>
      <Footer />
    </>
  );
}
