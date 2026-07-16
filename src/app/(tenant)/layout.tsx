'use client';

import '../globals.css';
import { I18nextProvider } from 'react-i18next';

import i18n from '@shared/lib/i18n';
import { Suspense, useEffect } from 'react';
import { SpaceChrome } from '@widgets/dashboard';
import { authClient } from '@api/client';

import { useGateContextStore } from '@entities/tenant';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const hydrate = useGateContextStore(s => s.hydrate);

  useEffect(() => {
    if (session) hydrate();
  }, [session, hydrate]);

  const inner = <Suspense fallback={null}>{children}</Suspense>;

  return (
    <I18nextProvider i18n={i18n}>
      {session ? <SpaceChrome>{inner}</SpaceChrome> : inner}
    </I18nextProvider>
  );
}
