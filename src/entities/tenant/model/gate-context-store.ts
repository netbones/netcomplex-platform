import { create } from 'zustand';

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
      const res = await fetch('/api/gate/context');
      if (!res.ok) return;
      const data = await res.json();
      set({ modules: data.modules ?? {}, hydrated: true });
    } catch {
      // leave hydrated: false — default-deny on failure
    }
  },

  invalidate: () => set({ modules: {}, hydrated: false }),
}));
