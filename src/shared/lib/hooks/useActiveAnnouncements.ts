import { useQuery } from '@tanstack/react-query';

export function useActiveAnnouncements() {
  return useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: () => fetch('/api/announcements?active=true&limit=5').then(r => r.json()),
    staleTime: 30_000,
  });
}
