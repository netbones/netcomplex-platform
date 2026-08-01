import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await apiGet<unknown[]>('/api/users')).data,
    staleTime: 10 * 60 * 1000,
  });
}
