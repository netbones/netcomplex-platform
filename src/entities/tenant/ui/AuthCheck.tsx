'use client';

import { useEffect } from 'react';
import { authClient } from '@api/client';
import { useRouter } from 'next/navigation';

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: isLoading } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/sign-in');
    }
  }, [session, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
