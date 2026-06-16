'use client';

import { useQuery } from '@tanstack/react-query';

interface UnreadUrgency {
  unreadCount: number;
  urgentCount: number;
}

async function fetchUnreadUrgency(): Promise<UnreadUrgency> {
  const res = await fetch('/api/messages/urgency');
  if (!res.ok) throw new Error('Failed to fetch message urgency');
  const json = await res.json();
  return json.success !== undefined ? json.data : json;
}

export function useUnreadUrgency() {
  return useQuery({
    queryKey: ['messages', 'urgency'],
    queryFn: fetchUnreadUrgency,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
