'use client';

import { useUser } from '@stackframe/react';

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const user = useUser({ or: 'redirect' });

  return <>{children}</>;
}
