import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export interface AdminContentItem {
  id: string;
  title: string;
  published: boolean;
  [key: string]: unknown;
}

export function useAdminContent(locale?: string) {
  return useQuery({
    queryKey: ['admin', 'content', locale],
    queryFn: async (): Promise<AdminContentItem[]> =>
      (await apiGet<AdminContentItem[]>(`/api/content?locale=${locale || 'en'}`)).data ?? [],
    staleTime: 60 * 60 * 1000,
  });
}
