import { useQuery } from '@tanstack/react-query';

export function useUnreadMessages(enabled = true) {
  return useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: () => fetch('/api/messages/unread').then(r => r.json()),
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled,
  });
}
