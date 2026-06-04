'use client';

import { SpaceChrome } from '@widgets/dashboard/ui/SpaceChrome';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SpaceChrome>{children}</SpaceChrome>;
}
