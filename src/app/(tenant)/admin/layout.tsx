'use client';

import { SpaceChrome } from '@widgets/dashboard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SpaceChrome>{children}</SpaceChrome>;
}
