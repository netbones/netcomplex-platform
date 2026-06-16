'use client';

import { useQuery } from '@tanstack/react-query';

export interface DashboardStats {
  requests: number;
  bookings: number;
  messages: number;
  notifications: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 30_000,
  });
}
