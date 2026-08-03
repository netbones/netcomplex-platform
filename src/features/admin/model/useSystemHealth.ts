'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/shared/api/http-client';

export interface SystemHealth {
  db: 'connected' | 'disconnected';
  tenantId: string;
  tenantName: string;
  totalUsers: number;
  activeUsers: number;
}

async function fetchSystemHealth(): Promise<SystemHealth> {
  const { data } = await apiGet<SystemHealth>('/api/admin/system/health');
  return data;
}

export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: ['admin', 'system', 'health'],
    queryFn: fetchSystemHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
