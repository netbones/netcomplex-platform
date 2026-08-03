'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export function useServicesUrgency<T = Record<string, unknown>>() {
  return useQuery<T>({
    queryKey: ['services', 'urgency'],
    queryFn: async () => {
      const { data } = await apiGet<T>('/api/services/urgency');
      return data;
    },
    staleTime: 30_000,
  });
}
