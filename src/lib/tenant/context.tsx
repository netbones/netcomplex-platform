'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Tenant } from '@/lib/tenant';

interface TenantContextValue {
  tenant: Tenant | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isLoading: true,
});

export function TenantContextProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch tenant from API or use window.__TENANT__ injected by server
    const tenantData = (window as unknown as { __TENANT__?: Tenant }).__TENANT__;
    if (tenantData) {
      setTenant(tenantData);
    }
    setIsLoading(false);
  }, []);

  return <TenantContext.Provider value={{ tenant, isLoading }}>{children}</TenantContext.Provider>;
}

export const useTenant = (): Tenant | null => {
  const context = useContext(TenantContext);
  return context.tenant;
};

export const useTenantLoading = (): boolean => {
  const context = useContext(TenantContext);
  return context.isLoading;
};
