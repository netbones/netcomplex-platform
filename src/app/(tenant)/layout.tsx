'use client';

import '../globals.css';
import { I18nextProvider } from 'react-i18next';
// eslint-disable-next-line no-restricted-imports -- barrel deliberately excludes client-only i18n
import i18n from '@shared/lib/i18n';
import { Toaster } from 'sonner';
import { Suspense } from 'react';
import { SpaceChrome } from '@widgets/dashboard';
import { authClient } from '@api/client';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();

  const inner = <Suspense fallback={null}>{children}</Suspense>;

  return (
    <I18nextProvider i18n={i18n}>
      <Toaster position="top-right" />
      {session ? <SpaceChrome>{inner}</SpaceChrome> : inner}
    </I18nextProvider>
  );
}
