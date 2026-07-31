import { useQuery } from '@tanstack/react-query';

export function useAdminContent(locale?: string) {
  return useQuery({
    queryKey: ['admin', 'content', locale],
    queryFn: () => fetch(`/api/content?locale=${locale || 'en'}`).then(r => r.json()),
    // ADVISORY-037 §Data Freshness Matrix — Documents / Resources
    // rarely changes. Bumped from 30s to 1h; mutations invalidate via
    // revalidateContent() (bd-y9v0).
    staleTime: 60 * 60 * 1000,
  });
}
