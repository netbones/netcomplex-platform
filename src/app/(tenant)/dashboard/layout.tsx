'use client';

import { SpaceChrome } from '@widgets/dashboard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SpaceChrome>{children}</SpaceChrome>;
}
