'use client';

import { useQuery } from '@tanstack/react-query';

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  organizer: string | null;
  image: string | null;
  isPublic: boolean;
}

async function fetchUpcomingEvents(): Promise<Event[]> {
  const res = await fetch('/api/events?limit=5&upcoming=true');
  if (!res.ok) throw new Error('Failed to fetch events');
  const json = await res.json();
  return json.success !== undefined ? json.data : json;
}

export function useUpcomingEvents() {
  return useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: fetchUpcomingEvents,
    staleTime: 60_000,
  });
}
