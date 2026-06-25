'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

export type ActivityDomain = 'maintenance' | 'users' | 'content' | 'surveys' | 'events';

export interface ActivityItem {
  id: string;
  domain: ActivityDomain;
  action: string;
  resourceLabel: string | null;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface ActivityPage {
  items: ActivityItem[];
  nextCursor: string | null;
}

interface UseAdminActivityOptions {
  domain?: ActivityDomain | 'all';
  limit?: number;
}

async function fetchActivityPage({
  domain = 'all',
  limit = 20,
  cursor,
}: {
  domain: string;
  limit: number;
  cursor?: string;
}): Promise<ActivityPage> {
  const params = new URLSearchParams({ domain, limit: String(limit) });
  if (cursor) params.set('cursor', cursor);

  const res = await fetch(`/api/admin/activity?${params}`, {
    credentials: 'same-origin',
  });

  if (!res.ok) {
    throw new Error(`Activity fetch failed: ${res.status}`);
  }

  const body = await res.json();
  return body.data as ActivityPage;
}

export function useAdminActivity({ domain = 'all', limit = 20 }: UseAdminActivityOptions = {}) {
  return useInfiniteQuery<ActivityPage>({
    queryKey: ['admin', 'activity', domain, limit],
    queryFn: ({ pageParam }) =>
      fetchActivityPage({
        domain,
        limit,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
