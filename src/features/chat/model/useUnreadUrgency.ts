'use client';

import { useQuery } from '@tanstack/react-query';

export function useUnreadUrgency<T = Record<string, unknown>>() {
  return useQuery<T>({
    queryKey: ['messages', 'urgency'],
    queryFn: async () => {
      const res = await fetch('/api/messages/urgency');
      if (!res.ok) throw new Error('Failed to fetch message urgency');
      const body = await res.json();
      return (body.success ? body.data : body) as T;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
