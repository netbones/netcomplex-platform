'use client';

import { useQuery } from '@tanstack/react-query';

interface AdminUrgency {
  pendingMaintenance: number;
  pendingInquiries: number;
  pendingApprovals: number;
  totalAlerts: number;
}

async function fetchAdminUrgency(): Promise<AdminUrgency> {
  const res = await fetch('/api/admin/urgency');
  if (!res.ok) throw new Error('Failed to fetch admin urgency');
  const json = await res.json();
  return json.success !== undefined ? json.data : json;
}

export function useAdminUrgency() {
  return useQuery({
    queryKey: ['admin', 'urgency'],
    queryFn: fetchAdminUrgency,
    staleTime: 30_000,
  });
}
