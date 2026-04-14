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
                  height: isCollapsing ? 60 : currentLayout.lastHeight || currentLayout.height, // 60px is header height
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
