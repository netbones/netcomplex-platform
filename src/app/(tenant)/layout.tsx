'use client';

import '../globals.css';
import { I18nextProvider } from 'react-i18next';
import i18n from '@shared/lib18n';
import { Toaster } from 'sonner';
import { Suspense } from 'react';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <Toaster position="top-right" />
      <Suspense fallback={null}>{children}</Suspense>
    </I18nextProvider>
  );
}
