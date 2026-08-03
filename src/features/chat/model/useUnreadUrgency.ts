'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export function useUnreadUrgency<T = Record<string, unknown>>() {
  return useQuery<T>({
    queryKey: ['messages', 'urgency'],
    queryFn: async () => {
      const { data } = await apiGet<T>('/api/messages/urgency');
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
