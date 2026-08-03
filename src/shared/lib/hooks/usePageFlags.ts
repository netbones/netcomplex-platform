'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';
import type { PlatformPageFlags } from '../types';

const FLAGS_URL = '/api/flags';

// Sentinel for callers without a tenantId in scope today. The server `/api/flags`
// route resolves tenant via `withTenant()`, so all callers without an explicit
// tenantId end up resolving the *current* tenant server-side. This key namespaces
// them under the current-tenant bucket while leaving room for explicit per-tenant
// partitioning once a client-side tenant context lands. Tracked in bd-y9v0.
const CURRENT_TENANT_KEY = '__current__';

export function usePageFlags(tenantId?: string) {
  const {
    data: flags,
    isLoading,
    error,
    refetch,
  } = useQuery<PlatformPageFlags>({
    queryKey: ['page-flags', tenantId ?? CURRENT_TENANT_KEY],
    queryFn: async () => {
      const { data } = await apiGet<unknown>(FLAGS_URL);
      return (data as { flags?: PlatformPageFlags } | null)?.flags ?? (data as PlatformPageFlags);
    },
    staleTime: 5 * 60 * 1000,
  });

  return { flags: flags ?? null, isLoading, error, refetch };
}
