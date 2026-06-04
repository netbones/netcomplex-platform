'use client';

import { SpaceChrome } from '@widgets/dashboard/ui/SpaceChrome';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SpaceChrome>{children}</SpaceChrome>;
}
