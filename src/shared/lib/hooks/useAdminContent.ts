import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export function useAdminContent(locale?: string) {
  return useQuery({
    queryKey: ['admin', 'content', locale],
    queryFn: async () => (await apiGet(`/api/content?locale=${locale || 'en'}`)).data,
    staleTime: 60 * 60 * 1000,
  });
}
