import { create } from 'zustand';
import { apiGet } from '@/shared/api/http-client';

interface GateContextState {
  modules: Record<string, boolean>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  invalidate: () => void;
}

export const useGateContextStore = create<GateContextState>()((set, get) => ({
  modules: {},
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const { data } = await apiGet<{ modules?: Record<string, boolean> }>('/api/gate/context');
      set({ modules: data.modules ?? {}, hydrated: true });
    } catch {
      // leave hydrated: false — default-deny on failure
    }
  },

  invalidate: () => set({ modules: {}, hydrated: false }),
}));
