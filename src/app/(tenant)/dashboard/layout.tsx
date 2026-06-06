'use client';

import { SpaceChrome } from '@widgets/dashboard/SpaceChrome';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SpaceChrome>{children}</SpaceChrome>;
}
