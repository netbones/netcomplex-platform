import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export function useConversations<T>(userId: string | undefined): UseQueryResult<T[], Error> {
  return useQuery<T[]>({
    queryKey: ['conversations', userId],
    queryFn: () => fetch(`/api/conversations?userId=${userId}`).then(r => r.json() as Promise<T[]>),
    staleTime: 10_000,
    enabled: !!userId,
  });
}
