'use client';

import { useQuery } from '@tanstack/react-query';

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  location: string | null;
  image: string | null;
  registered: boolean;
  attendeeCount: number;
  attendees: { name: string; avatar: string | null }[];
}

async function fetchUpcomingEvents(): Promise<UpcomingEvent[]> {
  const res = await fetch('/api/events?limit=5&upcoming=true');
  if (!res.ok) throw new Error('Failed to fetch events');
  const body = await res.json();
  return (body?.data ?? body ?? []) as UpcomingEvent[];
}

export function useUpcomingEvents() {
  return useQuery<UpcomingEvent[]>({
    queryKey: ['events', 'upcoming'],
    queryFn: fetchUpcomingEvents,
    staleTime: 60_000,
  });
}
