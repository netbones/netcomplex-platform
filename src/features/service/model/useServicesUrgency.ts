'use client';

import { useQuery } from '@tanstack/react-query';

export function useServicesUrgency<T = Record<string, unknown>>() {
  return useQuery<T>({
    queryKey: ['services', 'urgency'],
    queryFn: async () => {
      const res = await fetch('/api/services/urgency');
      if (!res.ok) throw new Error('Failed to fetch service urgency');
      const body = await res.json();
      return (body.success ? body.data : body) as T;
    },
    staleTime: 30_000,
  });
}
