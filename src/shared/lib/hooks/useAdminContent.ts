import { useQuery } from '@tanstack/react-query';

export function useAdminContent(locale?: string) {
  return useQuery({
    queryKey: ['admin', 'content', locale],
    queryFn: () => fetch(`/api/content?locale=${locale || 'en'}`).then(r => r.json()),
    staleTime: 30_000,
  });
}
