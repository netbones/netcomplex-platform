import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export function useUnreadMessages(enabled = true) {
  return useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: async () => (await apiGet('/api/messages/unread')).data,
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled,
  });
}
