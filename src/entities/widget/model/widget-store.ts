import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createComponentLogger } from '@shared/lib';
import { getDefaultLayout } from './default-layouts';
import { TAB_TO_SPACE_MAP } from './tab-migration-map';

const log = createComponentLogger('WidgetStore');

export interface WidgetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  isCollapsed: boolean;
  lastHeight?: number; // Store the height before collapsing, so we can restore it when expanding
}

export interface WidgetLayouts {
  [tabId: string]: {
    [widgetId: string]: WidgetLayout;
  };
}

export interface UserWidgets {
  [tabId: string]: string[];
}

interface WidgetStore {
  layouts: WidgetLayouts;
  userWidgets: UserWidgets;

  // Get layout for a specific widget in a specific tab
  getWidgetLayout: (tabId: string, widgetId: string) => WidgetLayout | undefined;

  // Update widget layout
  updateWidgetLayout: (tabId: string, widgetId: string, layout: Partial<WidgetLayout>) => void;

  // Toggle widget collapsed state
  toggleWidgetCollapsed: (tabId: string, widgetId: string) => void;

  // Reset layout for a tab
  resetTabLayout: (tabId: string) => void;

  // Reset all layouts
  resetAllLayouts: () => void;

  // Set user widgets (which widgets are active per tab)
  setUserWidgets: (widgets: UserWidgets) => void;

  // Add a widget to a tab
  addWidgetToTab: (tabId: string, widgetId: string) => void;

  // Remove a widget from a tab
  removeWidgetFromTab: (tabId: string, widgetId: string) => void;

  // Reset user widgets to defaults (clears all custom widget selections)
  resetLayout: () => void;

  // Reset a specific tab to its default widget configuration
  resetTabToDefaults: (tabId: string, defaultWidgets: string[]) => void;

  // Reset all tabs to role-seeded defaults and persist to DB
  resetToRoleDefaults: (role: string, userId: string) => void;

  // Migrate old tab-keyed layouts to space-keyed layouts
  migrateToSpaceLayouts: () => void;

  // Database synchronization
  hydrateFromDatabase: (layout: string | null) => void;
  hydrateFromServer: (userId: string) => Promise<void>;
  saveToDatabase: (userId: string) => Promise<void>;
  isHydratedFromDb: boolean;
}

// Stable default layout to prevent infinite re-renders
const defaultWidgetLayout: WidgetLayout = Object.freeze({
  x: 0,
  y: 0,
  width: 320,
  height: 200,
  isCollapsed: false,
});

// Debounce timer for auto-save
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 500;

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      layouts: {},
      userWidgets: {},
      isHydratedFromDb: false,

      getWidgetLayout: (tabId: string, widgetId: string) => {
        const tabLayouts = get().layouts[tabId];
        return tabLayouts?.[widgetId] || { ...defaultWidgetLayout };
      },

      updateWidgetLayout: (
        tabId: string,
        widgetId: string,
        layoutUpdate: Partial<WidgetLayout>
      ) => {
        set(state => {
          const tabLayouts = state.layouts[tabId] || {};
          const currentLayout = tabLayouts[widgetId] || defaultWidgetLayout;

          return {
            layouts: {
              ...state.layouts,
              [tabId]: {
                ...tabLayouts,
                [widgetId]: {
                  ...currentLayout,
                  ...layoutUpdate,
                },
              },
            },
          };
        });
      },

      toggleWidgetCollapsed: (tabId: string, widgetId: string) => {
        set(state => {
          const tabLayouts = state.layouts[tabId];
          const currentLayout = tabLayouts?.[widgetId] || defaultWidgetLayout;
          const isCollapsing = !currentLayout.isCollapsed;

          return {
            layouts: {
              ...state.layouts,
              [tabId]: {
                ...tabLayouts,
                [widgetId]: {
                  ...currentLayout,
                  isCollapsed: isCollapsing,
                  height: isCollapsing ? 60 : currentLayout.lastHeight || currentLayout.height,
                  lastHeight: isCollapsing ? currentLayout.height : currentLayout.lastHeight,
                },
              },
            },
          };
        });
      },

      resetTabLayout: (tabId: string) => {
        set(state => {
          const newLayouts = { ...state.layouts };
          delete newLayouts[tabId];
          const newUserWidgets = { ...state.userWidgets };
          delete newUserWidgets[tabId];
          return { layouts: newLayouts, userWidgets: newUserWidgets };
        });
      },

      resetAllLayouts: () => {
        set({ layouts: {} });
      },

      setUserWidgets: (widgets: UserWidgets) => {
        set({ userWidgets: widgets });
      },

      addWidgetToTab: (tabId: string, widgetId: string) => {
        set(state => {
          const tabWidgets = state.userWidgets[tabId] || [];
          if (tabWidgets.includes(widgetId)) return state;
          return {
            userWidgets: {
              ...state.userWidgets,
              [tabId]: [...tabWidgets, widgetId],
            },
          };
        });
      },

      removeWidgetFromTab: (tabId: string, widgetId: string) => {
        set(state => {
          const tabWidgets = state.userWidgets[tabId] || [];
          return {
            userWidgets: {
              ...state.userWidgets,
              [tabId]: tabWidgets.filter(id => id !== widgetId),
            },
          };
        });
      },

      resetLayout: () => {
        set({ layouts: {}, userWidgets: {} });
      },

      resetTabToDefaults: (tabId: string, defaultWidgets: string[]) => {
        set(state => ({
          userWidgets: {
            ...state.userWidgets,
            [tabId]: [...defaultWidgets],
          },
          layouts: {
            ...state.layouts,
            [tabId]: {},
          },
        }));
      },

      resetToRoleDefaults: (role: string, userId: string) => {
        const defaults = getDefaultLayout(role);
        set({
          userWidgets: defaults.userWidgets,
          layouts: defaults.layouts,
        });
        // Persist to DB after reset
        get().saveToDatabase(userId);
      },

      /**
       * Migrate old tab-keyed layout to space-keyed layout.
       * Converts keys using TAB_TO_SPACE_MAP and merges widgets from
       * multiple old tabs into their new space keys.
       * Called during hydrateFromServer if the stored layout uses old tab keys.
       */
      migrateToSpaceLayouts: () => {
        const { userWidgets, layouts } = get();
        const oldTabKeys = Object.keys(TAB_TO_SPACE_MAP);
        const hasOldKeys = Object.keys(userWidgets).some(k => oldTabKeys.includes(k));

        if (!hasOldKeys) return; // Already space-keyed, no migration needed

        const newUserWidgets: UserWidgets = {};
        const newLayouts: WidgetLayouts = {};

        // Remap userWidgets
        for (const [key, widgets] of Object.entries(userWidgets)) {
          const spaceKey = TAB_TO_SPACE_MAP[key] || key;
          const existing = newUserWidgets[spaceKey] || [];
          newUserWidgets[spaceKey] = [...new Set([...existing, ...widgets])];
        }

        // Remap layouts
        for (const [key, widgetLayouts] of Object.entries(layouts)) {
          const spaceKey = TAB_TO_SPACE_MAP[key] || key;
          const existing = newLayouts[spaceKey] || {};
          newLayouts[spaceKey] = { ...existing, ...widgetLayouts };
        }

        log.info(
          { oldKeys: Object.keys(userWidgets), newKeys: Object.keys(newUserWidgets) },
          'Migrated tab-keyed layouts to space-keyed'
        );
        set({ userWidgets: newUserWidgets, layouts: newLayouts });
      },

      hydrateFromDatabase: (layout: string | null) => {
        if (!layout) {
          set({ isHydratedFromDb: true });
          return;
        }

        try {
          const parsed = typeof layout === 'string' ? JSON.parse(layout) : layout;
          set({
            layouts: parsed.layouts || {},
            userWidgets: parsed.userWidgets || {},
            isHydratedFromDb: true,
          });
        } catch (err) {
          log.error({ err }, 'Failed to hydrate from DB');
          set({ isHydratedFromDb: true });
        }
      },

      /**
       * Hydrate widget layout from server API.
       * Fetches GET /api/users/[userId], reads dashboardLayout field,
       * and merges with localStorage (server wins on conflict).
       */
      hydrateFromServer: async (userId: string) => {
        try {
          const response = await fetch(`/api/users/${userId}`);
          if (!response.ok) {
            log.error({ status: response.status }, 'Failed to fetch user for widget hydration');
            set({ isHydratedFromDb: true });
            return;
          }

          const body = await response.json();
          const userData = body?.data ?? body;
          const dashboardLayout = userData.dashboardLayout;

          if (dashboardLayout) {
            // Server is source of truth — merge with localStorage, server wins on conflict
            const parsed =
              typeof dashboardLayout === 'string' ? JSON.parse(dashboardLayout) : dashboardLayout;

            // Check if layout uses old tab keys and auto-migrate
            const oldTabKeys = Object.keys(TAB_TO_SPACE_MAP);
            const widgetKeys = Object.keys(parsed.userWidgets || {});
            const hasOldKeys = widgetKeys.some(k => oldTabKeys.includes(k));

            set({
              layouts: parsed.layouts || {},
              userWidgets: parsed.userWidgets || {},
              isHydratedFromDb: true,
            });

            // Auto-migrate old tab-keyed layouts to space-keyed
            if (hasOldKeys) {
              get().migrateToSpaceLayouts();
            }
          } else {
            // No server layout — keep localStorage as-is
            set({ isHydratedFromDb: true });
          }
        } catch (err) {
          log.error({ err }, 'Failed to hydrate from server');
          // Fallback to localStorage — mark hydrated so saves can proceed
          set({ isHydratedFromDb: true });
        }
      },

      /**
       * Save current layout to DB via PATCH /api/users/[userId].
       * Silently continues on failure (localStorage is the fallback cache).
       */
      saveToDatabase: async (userId: string) => {
        const { layouts, userWidgets, isHydratedFromDb } = get();

        // Don't save if we haven't hydrated from DB yet (prevents overwriting DB with default local state)
        if (!isHydratedFromDb) return;

        try {
          const dashboardLayout = JSON.stringify({ layouts, userWidgets });
          const response = await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dashboardLayout }),
          });

          if (!response.ok) {
            throw new Error(`Failed to save layout: ${response.status}`);
          }
        } catch (err) {
          log.error({ err }, 'Failed to save to DB');
        }
      },
    }),
    {
      name: 'widget-layouts',
      version: 5,
      migrate: (persistedState: unknown, version: number) => {
        const persisted = persistedState as Record<string, unknown>;
        let state = { ...persisted };

        if (version < 2) {
          state = { ...state, userWidgets: {} };
        }

        // v4→v5: Migrate old tab keys to space keys
        if (version < 5) {
          const userWidgets = state.userWidgets as Record<string, string[]> | undefined;
          const layouts = state.layouts as Record<string, Record<string, unknown>> | undefined;

          const hasOldKeys =
            userWidgets &&
            Object.keys(userWidgets).some(k => Object.keys(TAB_TO_SPACE_MAP).includes(k));

          if (hasOldKeys && userWidgets) {
            const newUserWidgets: Record<string, string[]> = {};
            const newLayouts: Record<string, Record<string, unknown>> = {};

            for (const [key, widgets] of Object.entries(userWidgets)) {
              const spaceKey = TAB_TO_SPACE_MAP[key] || key;
              const existing = newUserWidgets[spaceKey] || [];
              newUserWidgets[spaceKey] = [...new Set([...existing, ...widgets])];
            }

            if (layouts) {
              for (const [key, widgetLayouts] of Object.entries(layouts)) {
                const spaceKey = TAB_TO_SPACE_MAP[key] || key;
                const existing = newLayouts[spaceKey] || {};
                newLayouts[spaceKey] = { ...existing, ...widgetLayouts };
              }
            }

            state = { ...state, userWidgets: newUserWidgets, layouts: newLayouts };
          }
        }

        return state;
      },
    }
  )
);

/**
 * Subscribe to widget store changes and auto-save to DB with debounce.
 * Call this once on app mount after authentication.
 * Pattern: localStorage = fast local cache, DB = source of truth across devices.
 */
export function subscribeWidgetAutoSave(userId: string) {
  return useWidgetStore.subscribe(state => {
    // Skip saves before hydration completes (prevents overwriting DB with defaults)
    if (!state.isHydratedFromDb) return;

    // Debounce: wait 500ms after last change before saving
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      state.saveToDatabase(userId);
    }, SAVE_DEBOUNCE_MS);
  });
}
