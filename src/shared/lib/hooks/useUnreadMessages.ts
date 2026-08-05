import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export interface UnreadMessagesResponse {
  unreadCounts: Record<string, number>;
  totalUnread: number;
}

export function useUnreadMessages(enabled = true) {
  return useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: async (): Promise<UnreadMessagesResponse> =>
      (await apiGet<UnreadMessagesResponse>('/api/messages/unread')).data ?? {
        unreadCounts: {},
        totalUnread: 0,
      },
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled,
  });
}
