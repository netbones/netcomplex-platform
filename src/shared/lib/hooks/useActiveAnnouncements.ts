import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export function useActiveAnnouncements() {
  return useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: async () => (await apiGet('/api/announcements?active=true&limit=5')).data,
    staleTime: 30_000,
  });
}
