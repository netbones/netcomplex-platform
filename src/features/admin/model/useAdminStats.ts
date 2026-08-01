'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export interface AdminStats {
  totalUsers: number;
  activeRequests: number;
  totalGroups: number;
  totalContent: number;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const [users, requests, content] = await Promise.all([
    apiGet<unknown[]>('/api/users'),
    apiGet<unknown[]>('/api/maintenance'),
    apiGet<unknown[]>('/api/content'),
  ]);

  const count = (
    result: { data: unknown; meta?: Record<string, unknown> },
    fallback: number
  ): number => {
    if (result.meta?.total !== undefined) return result.meta.total as number;
    return Array.isArray(result.data) ? result.data.length : fallback;
  };

  return {
    totalUsers: count(users, 0),
    activeRequests: count(requests, 0),
    totalGroups: 0, // /api/groups does not exist as a REST route; groups are tRPC-only
    totalContent: count(content, 0),
  };
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
    staleTime: 60_000,
  });
}
