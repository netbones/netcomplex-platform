'use client';

import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  totalUsers: number;
  totalProperties: number;
  totalMaintenanceRequests: number;
  pendingRequests: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  const json = await res.json();
  return json.success !== undefined ? json.data : json;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 30_000,
  });
}
