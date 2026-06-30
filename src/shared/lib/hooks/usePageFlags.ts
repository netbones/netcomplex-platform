'use client';

import { useQuery } from '@tanstack/react-query';
import type { PlatformPageFlags } from '../types';

const FLAGS_URL = '/api/flags';

export function usePageFlags() {
  const {
    data: flags,
    isLoading,
    error,
    refetch,
  } = useQuery<PlatformPageFlags>({
    queryKey: ['page-flags'],
    queryFn: async () => {
      const res = await fetch(FLAGS_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return (body?.data?.flags ?? body?.flags ?? body) as PlatformPageFlags;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { flags: flags ?? null, isLoading, error, refetch };
}
