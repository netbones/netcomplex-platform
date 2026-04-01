import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WidgetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  isCollapsed: boolean;
}

export interface WidgetLayouts {
  [tabId: string]: {
    [widgetId: string]: WidgetLayout;
  };
}

interface WidgetStore {
  layouts: WidgetLayouts;

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
}

const defaultWidgetLayout: WidgetLayout = {
  x: 0,
  y: 0,
  width: 320,
  height: 200,
  isCollapsed: false,
};

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      layouts: {},

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
          const currentLayout = tabLayouts[widgetId] || { ...defaultWidgetLayout };

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
        const currentLayout = get().getWidgetLayout(tabId, widgetId);
        if (currentLayout) {
          get().updateWidgetLayout(tabId, widgetId, {
            isCollapsed: !currentLayout.isCollapsed,
          });
        }
      },

      resetTabLayout: (tabId: string) => {
        set(state => {
          const newLayouts = { ...state.layouts };
          delete newLayouts[tabId];
          return { layouts: newLayouts };
        });
      },

      resetAllLayouts: () => {
        set({ layouts: {} });
      },
    }),
    {
      name: 'widget-layouts',
      version: 1,
    }
  )
);
