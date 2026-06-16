'use client';

import { useQuery } from '@tanstack/react-query';

export function useAdminUrgency<T = Record<string, unknown>>() {
  return useQuery<T>({
    queryKey: ['admin', 'urgency'],
    queryFn: async () => {
      const res = await fetch('/api/admin/urgency');
      if (!res.ok) throw new Error('Failed to fetch admin urgency');
      const body = await res.json();
      return (body.success ? body.data : body) as T;
    },
    staleTime: 30_000,
  });
}
