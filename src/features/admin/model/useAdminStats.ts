'use client';

import { useQuery } from '@tanstack/react-query';

export interface AdminStats {
  totalUsers: number;
  activeRequests: number;
  totalGroups: number;
  totalContent: number;
}

async function fetchAdminStats(): Promise<AdminStats> {
  const [usersRes, requestsRes, groupsRes, contentRes] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/maintenance'),
    fetch('/api/groups'),
    fetch('/api/content'),
  ]);
  const [users, requests, groups, content] = await Promise.all([
    usersRes.json(),
    requestsRes.json(),
    groupsRes.json(),
    contentRes.json(),
  ]);
  const extractData = (res: unknown): unknown => (res as { data?: unknown })?.data ?? res;

  const count = (res: unknown): number => {
    const v = extractData(res);
    if (Array.isArray(v)) return v.length;
    const meta = (res as { meta?: { total?: number } })?.meta;
    if (meta?.total !== undefined) return meta.total;
    return (
      (v as { total?: number; count?: number })?.total ??
      (v as { total?: number; count?: number })?.count ??
      0
    );
  };

  return {
    totalUsers: count(users),
    activeRequests: count(requests),
    totalGroups: count(groups),
    totalContent: count(content),
  };
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
    staleTime: 60_000,
  });
}
