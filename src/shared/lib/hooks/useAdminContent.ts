import { useQuery } from '@tanstack/react-query';

export function useAdminContent() {
  return useQuery({
    queryKey: ['admin', 'content'],
    queryFn: () => fetch('/api/content').then(r => r.json()),
    staleTime: 30_000,
  });
}
