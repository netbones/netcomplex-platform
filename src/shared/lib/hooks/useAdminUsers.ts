import { useQuery } from '@tanstack/react-query';

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
    // ADVISORY-037 §Data Freshness Matrix — Directory / Providers
    // rarely changes; bump from 30s to 10min so the admin directory list
    // doesn't refetch on every widget remount.
    staleTime: 10 * 60 * 1000,
  });
}
