import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Tenant } from '@shared/lib';

interface TenantState {
  tenant: Tenant | null;
  isLoading: boolean;
  setTenant: (tenant: Tenant | null) => void;
  setLoading: (loading: boolean) => void;
}

// SSR-compatible Zustand store for tenant state
export const useTenantStore = create<TenantState>()(set => ({
  tenant: null,
  isLoading: false,
  setTenant: tenant => set({ tenant }),
  setLoading: isLoading => set({ isLoading }),
}));

// React hooks for accessing tenant state
export const useTenant = (): Tenant | null => {
  return useTenantStore(state => state.tenant);
};

export const useTenantLoading = (): boolean => {
  return useTenantStore(state => state.isLoading);
};

export const useTenantActions = () => {
  return useTenantStore(
    useShallow(state => ({
      setTenant: state.setTenant,
      setLoading: state.setLoading,
    }))
  );
};
