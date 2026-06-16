'use client';

import { useQuery } from '@tanstack/react-query';

interface ServicesUrgency {
  pendingInquiries: number;
  totalInquiries: number;
}

async function fetchServicesUrgency(): Promise<ServicesUrgency> {
  const res = await fetch('/api/services/urgency');
  if (!res.ok) throw new Error('Failed to fetch service urgency');
  const json = await res.json();
  return json.success !== undefined ? json.data : json;
}

export function useServicesUrgency() {
  return useQuery({
    queryKey: ['services', 'urgency'],
    queryFn: fetchServicesUrgency,
    staleTime: 30_000,
  });
}
