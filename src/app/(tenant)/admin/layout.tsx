'use client';

import { SpaceChrome } from '@widgets/dashboard/SpaceChrome';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SpaceChrome>{children}</SpaceChrome>;
}
