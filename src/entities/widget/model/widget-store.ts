import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

// Stable default layout to prevent infinite re-renders
const defaultWidgetLayout: WidgetLayout = Object.freeze({
  x: 0,
  y: 0,
  width: 320,
  height: 200,
  isCollapsed: false,
});

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      layouts: {},
      userWidgets: {},

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
    }),
    {
      name: 'widget-layouts',
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        const persisted = persistedState as Record<string, unknown>;
        if (version < 2) {
          return { ...persisted, userWidgets: {} };
        }
        return persisted;
      },
    }
  )
);
