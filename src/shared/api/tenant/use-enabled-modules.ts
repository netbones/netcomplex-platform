/**
 * Fetch enabled modules for a tenant
 *
 * Used by FeatureGate and components that need module-aware rendering
 */

import { useQuery } from '@tanstack/react-query';
import type { TenantModuleConfig } from '@api/tenant/types';

async function fetchEnabledModules(tenantId: string): Promise<Record<string, TenantModuleConfig>> {
  const res = await fetch(`/api/tenants/${tenantId}/modules`);
  if (!res.ok) {
    throw new Error('Failed to fetch modules');
  }
  return res.json();
}

export function useEnabledModules(tenantId: string) {
  return useQuery({
    queryKey: ['enabled-modules', tenantId],
    queryFn: () => fetchEnabledModules(tenantId),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if a specific module is enabled
 * Returns loading state, error, and enabled status
 */
export function useModuleEnabled(tenantId: string, moduleKey: string) {
  const { data: modules, isLoading, error } = useEnabledModules(tenantId);

  return {
    isEnabled: modules?.[moduleKey]?.enabled ?? false,
    config: modules?.[moduleKey]?.config,
    isLoading,
    error,
  };
}
