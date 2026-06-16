'use client';

import { useQuery } from '@tanstack/react-query';

interface AdminStats {
  totalUsers: number;
  totalRequests: number;
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

  return {
    totalUsers: Array.isArray(users) ? users.length : (users?.total ?? users?.count ?? 0),
    totalRequests: Array.isArray(requests)
      ? requests.length
      : (requests?.total ?? requests?.count ?? 0),
    totalGroups: Array.isArray(groups) ? groups.length : (groups?.total ?? groups?.count ?? 0),
    totalContent: Array.isArray(content) ? content.length : (content?.total ?? content?.count ?? 0),
  };
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
    staleTime: 60_000,
  });
}
