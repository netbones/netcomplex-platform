'use client';

import { useQuery } from '@tanstack/react-query';

export interface SystemHealth {
  db: 'connected' | 'disconnected';
  tenantId: string;
  tenantName: string;
  totalUsers: number;
  activeUsers: number;
}

async function fetchSystemHealth(): Promise<SystemHealth> {
  const res = await fetch('/api/admin/system/health', {
    credentials: 'same-origin',
  });

  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }

  const body = await res.json();
  return body.data as SystemHealth;
}

export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: ['admin', 'system', 'health'],
    queryFn: fetchSystemHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
