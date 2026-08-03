'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export function useAdminUrgency<T = Record<string, unknown>>() {
  return useQuery<T>({
    queryKey: ['admin', 'urgency'],
    queryFn: async () => {
      const { data } = await apiGet<T>('/api/admin/urgency');
      return data;
    },
    staleTime: 30_000,
  });
}
