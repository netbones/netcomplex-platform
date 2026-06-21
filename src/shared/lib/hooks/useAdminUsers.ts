import { useQuery } from '@tanstack/react-query';

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
    staleTime: 30_000,
  });
}
