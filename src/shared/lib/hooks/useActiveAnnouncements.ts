import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export interface ActiveAnnouncementsItem {
  id: string;
  title: string;
  content: string;
  author: string;
  priority: string;
  targetFilter: string;
  targetRoles: string[];
  resourceId: string | null;
  createdAt: string;
  expiresAt: string | null;
  resource?: {
    id: string;
    title: string;
    fileUrl: string | null;
    externalUrl: string | null;
  };
}

export function useActiveAnnouncements() {
  return useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: async (): Promise<ActiveAnnouncementsItem[]> =>
      (await apiGet<ActiveAnnouncementsItem[]>('/api/announcements?active=true&limit=5')).data ??
      [],
    staleTime: 30_000,
  });
}
