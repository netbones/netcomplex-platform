import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export function useConversations<T>(userId: string | undefined): UseQueryResult<T[], Error> {
  return useQuery<T[]>({
    queryKey: ['conversations', userId],
    queryFn: async () => (await apiGet<T[]>(`/api/conversations?userId=${userId}`)).data,
    staleTime: 10_000,
    enabled: !!userId,
  });
}
