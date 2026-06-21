import { useQuery } from '@tanstack/react-query';

export function useUpcomingEvents() {
  return useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => fetch('/api/events?upcoming=true&limit=5').then(r => r.json()),
    staleTime: 30_000,
  });
}
