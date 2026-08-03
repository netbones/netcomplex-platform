'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

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
  const { data } = await apiGet<UpcomingEvent[]>('/api/events?limit=5&upcoming=true');
  return data ?? [];
}

export function useUpcomingEvents() {
  return useQuery<UpcomingEvent[]>({
    queryKey: ['events', 'upcoming'],
    queryFn: fetchUpcomingEvents,
    // ADVISORY-037 §Data Freshness Matrix — Events: 5min. Bumped from 60s;
    // RSVP mutations should call revalidateEvents() once that helper lands
    // (currently revalidateDashboard() covers the /dashboard widget path).
    staleTime: 5 * 60 * 1000,
  });
}
