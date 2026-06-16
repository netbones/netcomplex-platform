'use client';

import { SpaceChrome } from '@widgets/dashboard';
import { authClient } from '@api/client';

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();

  if (session) {
    return <SpaceChrome>{children}</SpaceChrome>;
  }

  return <>{children}</>;
}
