'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export interface DashboardStats {
  requests: number;
  bookings: number;
  messages: number;
  notifications: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiGet<DashboardStats>('/api/dashboard/stats');
  return data;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 30_000,
  });
}
