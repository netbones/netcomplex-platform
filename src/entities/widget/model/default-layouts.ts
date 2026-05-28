/**
 * Default Dashboard Layouts
 *
 * DISCOVERY ANSWERS (confirmed from source):
 *
 * Q1 — Layout item shape:
 *   WidgetLayout = { x: number; y: number; width: number; height: number;
 *                    isCollapsed: boolean; lastHeight?: number }
 *   WidgetLayouts = { [tabId: string]: { [widgetId: string]: WidgetLayout } }
 *   UserWidgets = { [tabId: string]: string[] }
 *
 * Q2 — Tab identity storage:
 *   dashboardLayout is `string | null` where the string is
 *   JSON.stringify({ layouts: WidgetLayouts, userWidgets: UserWidgets })
 *   Both maps are keyed by tabId.
 *
 * Q3 — Tab identifiers (from DashboardPage.tsx DEFAULT_TABS):
 *   overview, maintenance, bookings, services, content, premium
 *
 * Q4 — dashboardLayout storage on user:
 *   `string | null` — JSON.stringify({ layouts, userWidgets })
 *   Hydrated via widget-store.ts hydrateFromDatabase(), persisted via saveToDatabase()
 */

import type { WidgetLayouts, UserWidgets } from '@entities/widget/model/widget-store';
import { TAB_TO_SPACE_MAP } from './tab-migration-map';

// ═══════════════════════════════════════════════════════════════
// LEGACY TAB-KEYED DEFAULTS (kept for backward compat when flag is off)
// ═══════════════════════════════════════════════════════════════

// RESIDENT DEFAULT LAYOUT

const RESIDENT_USER_WIDGETS: UserWidgets = {
  overview: ['stats', 'quick-actions', 'notifications', 'recent-activity', 'events', 'messages'],
  maintenance: ['maintenance-requests'],
  bookings: ['events', 'notifications'],
  services: ['my-services', 'service-inquiries'],
  content: ['my-content', 'my-album', 'media', 'bookshelf'],
  premium: ['premium-portfolio', 'agent-dashboard', 'agent-activity', 'community-graph-widget'],
};

const RESIDENT_LAYOUTS: WidgetLayouts = {
  overview: {
    stats: { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'quick-actions': { x: 0, y: 2, width: 2, height: 2, isCollapsed: false },
    notifications: { x: 2, y: 2, width: 2, height: 2, isCollapsed: false },
    'recent-activity': { x: 0, y: 4, width: 4, height: 2, isCollapsed: false },
    events: { x: 0, y: 6, width: 2, height: 2, isCollapsed: false },
    messages: { x: 2, y: 6, width: 2, height: 2, isCollapsed: false },
  },
  maintenance: {
    'maintenance-requests': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
  },
  bookings: {
    events: { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    notifications: { x: 0, y: 2, width: 4, height: 2, isCollapsed: false },
  },
  services: {
    'my-services': { x: 0, y: 0, width: 2, height: 2, isCollapsed: false },
    'service-inquiries': { x: 2, y: 0, width: 2, height: 2, isCollapsed: false },
  },
  content: {
    'my-content': { x: 0, y: 0, width: 2, height: 2, isCollapsed: false },
    'my-album': { x: 2, y: 0, width: 2, height: 2, isCollapsed: false },
    media: { x: 0, y: 2, width: 2, height: 2, isCollapsed: false },
    bookshelf: { x: 2, y: 2, width: 2, height: 2, isCollapsed: false },
  },
  premium: {
    'premium-portfolio': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    'agent-dashboard': { x: 0, y: 3, width: 2, height: 3, isCollapsed: false },
    'agent-activity': { x: 2, y: 3, width: 2, height: 3, isCollapsed: false },
    'community-graph-widget': { x: 0, y: 6, width: 4, height: 3, isCollapsed: false },
  },
};

// ═══════════════════════════════════════════════════════════════
// BOARD / COMMITTEE DEFAULT LAYOUT
// ═══════════════════════════════════════════════════════════════

const BOARD_USER_WIDGETS: UserWidgets = {
  overview: [
    'admin-stats',
    'admin-quick-links',
    'admin-activity',
    'notifications',
    'recent-activity',
  ],
  maintenance: ['maintenance-list'],
  bookings: ['events'],
  content: ['admin-events', 'admin-surveys', 'group-moderation'],
  services: ['my-services', 'service-inquiries'],
  premium: ['premium-portfolio', 'agent-dashboard'],
};

const BOARD_LAYOUTS: WidgetLayouts = {
  overview: {
    'admin-stats': { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'admin-quick-links': { x: 0, y: 2, width: 1, height: 2, isCollapsed: false },
    'admin-activity': { x: 1, y: 2, width: 2, height: 3, isCollapsed: false },
    notifications: { x: 3, y: 2, width: 1, height: 2, isCollapsed: false },
    'recent-activity': { x: 0, y: 5, width: 4, height: 2, isCollapsed: false },
  },
  maintenance: {
    'maintenance-list': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
  },
  bookings: {
    events: { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
  },
  content: {
    'admin-events': { x: 0, y: 0, width: 2, height: 2, isCollapsed: false },
    'admin-surveys': { x: 2, y: 0, width: 2, height: 2, isCollapsed: false },
    'group-moderation': { x: 0, y: 2, width: 4, height: 3, isCollapsed: false },
  },
  services: {
    'my-services': { x: 0, y: 0, width: 2, height: 2, isCollapsed: false },
    'service-inquiries': { x: 2, y: 0, width: 2, height: 2, isCollapsed: false },
  },
  premium: {
    'premium-portfolio': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    'agent-dashboard': { x: 0, y: 3, width: 4, height: 3, isCollapsed: false },
  },
};

// ═══════════════════════════════════════════════════════════════
// ADMIN / MANAGER DEFAULT LAYOUT
// ═══════════════════════════════════════════════════════════════

const ADMIN_USER_WIDGETS: UserWidgets = {
  overview: ['admin-stats', 'admin-quick-links', 'admin-user', 'admin-activity'],
  maintenance: ['maintenance-list', 'maintenance-analytics'],
  bookings: ['events'],
  content: ['admin-content', 'admin-events', 'admin-surveys', 'admin-competitions'],
  services: ['admin-resources'],
  premium: ['admin-system', 'page-settings'],
};

const ADMIN_LAYOUTS: WidgetLayouts = {
  overview: {
    'admin-stats': { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'admin-quick-links': { x: 0, y: 2, width: 1, height: 2, isCollapsed: false },
    'admin-user': { x: 1, y: 2, width: 2, height: 3, isCollapsed: false },
    'admin-activity': { x: 3, y: 2, width: 1, height: 3, isCollapsed: false },
  },
  maintenance: {
    'maintenance-list': { x: 0, y: 0, width: 2, height: 3, isCollapsed: false },
    'maintenance-analytics': { x: 2, y: 0, width: 2, height: 3, isCollapsed: false },
  },
  bookings: {
    events: { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
  },
  content: {
    'admin-content': { x: 0, y: 0, width: 2, height: 2, isCollapsed: false },
    'admin-events': { x: 2, y: 0, width: 2, height: 2, isCollapsed: false },
    'admin-surveys': { x: 0, y: 2, width: 2, height: 2, isCollapsed: false },
    'admin-competitions': { x: 2, y: 2, width: 2, height: 2, isCollapsed: false },
  },
  services: {
    'admin-resources': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
  },
  premium: {
    'admin-system': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    'page-settings': { x: 0, y: 3, width: 4, height: 3, isCollapsed: false },
  },
};

// ═══════════════════════════════════════════════════════════════
// EXPORTED DEFAULT LAYOUTS (keyed by role)
// ═══════════════════════════════════════════════════════════════

/**
 * Default widget lists per tab, keyed by user role.
 * Used to populate the dashboard when a user has no saved layout.
 */
export const DEFAULT_USER_WIDGETS: Record<string, UserWidgets> = {
  RESIDENT: RESIDENT_USER_WIDGETS,
  BOARD: BOARD_USER_WIDGETS,
  COMMITTEE: BOARD_USER_WIDGETS,
  ADMIN: ADMIN_USER_WIDGETS,
  MANAGER: ADMIN_USER_WIDGETS,
};

/**
 * Default widget layout positions per tab, keyed by user role.
 * Used to position widgets when a user has no saved layout.
 */
export const DEFAULT_LAYOUTS: Record<string, WidgetLayouts> = {
  RESIDENT: RESIDENT_LAYOUTS,
  BOARD: BOARD_LAYOUTS,
  COMMITTEE: BOARD_LAYOUTS,
  ADMIN: ADMIN_LAYOUTS,
  MANAGER: ADMIN_LAYOUTS,
};

/**
 * Get the default dashboard layout for a given role.
 * Falls back to RESIDENT defaults if the role is not recognized.
 *
 * @param role - User role string (e.g. 'RESIDENT', 'ADMIN', 'BOARD')
 * @returns Default userWidgets and layouts for the role
 */
export function getDefaultLayout(role: string): {
  userWidgets: UserWidgets;
  layouts: WidgetLayouts;
} {
  const normalized = role?.toUpperCase();
  const userWidgets = DEFAULT_USER_WIDGETS[normalized] || DEFAULT_USER_WIDGETS['RESIDENT'];
  const layouts = DEFAULT_LAYOUTS[normalized] || DEFAULT_LAYOUTS['RESIDENT'];
  return { userWidgets, layouts };
}

// ═══════════════════════════════════════════════════════════════
// SPACE-KEYED DEFAULTS (Focus Spaces architecture — Phase 30-B)
// ═══════════════════════════════════════════════════════════════

/**
 * Remap a tab-keyed UserWidgets map to space-keyed using TAB_TO_SPACE_MAP.
 * Merges widgets from multiple old tabs into their new space keys.
 */
function remapToSpaces(userWidgets: UserWidgets): UserWidgets {
  const spaceWidgets: UserWidgets = {};

  for (const [tabKey, widgets] of Object.entries(userWidgets)) {
    const spaceKey = TAB_TO_SPACE_MAP[tabKey] || tabKey;
    const existing = spaceWidgets[spaceKey] || [];
    // Merge and deduplicate
    spaceWidgets[spaceKey] = [...new Set([...existing, ...widgets])];
  }

  // Ensure messages and admin spaces exist
  if (!spaceWidgets['messages']) {
    spaceWidgets['messages'] = ['messages', 'notifications'];
  }

  return spaceWidgets;
}

/**
 * Remap a tab-keyed WidgetLayouts map to space-keyed using TAB_TO_SPACE_MAP.
 * Merges layout positions from multiple old tabs into their new space keys.
 */
function remapLayoutsToSpaces(layouts: WidgetLayouts): WidgetLayouts {
  const spaceLayouts: WidgetLayouts = {};

  for (const [tabKey, widgetLayouts] of Object.entries(layouts)) {
    const spaceKey = TAB_TO_SPACE_MAP[tabKey] || tabKey;
    const existing = spaceLayouts[spaceKey] || {};
    // Merge widget layouts (later tab wins on conflict for same widgetId)
    spaceLayouts[spaceKey] = { ...existing, ...widgetLayouts };
  }

  return spaceLayouts;
}

/** Space-keyed default widgets per role */
const RESIDENT_SPACE_WIDGETS: UserWidgets = remapToSpaces(RESIDENT_USER_WIDGETS);

/** Space-keyed default widgets for board — admin space added explicitly */
const BOARD_SPACE_WIDGETS: UserWidgets = (() => {
  const base = remapToSpaces(BOARD_USER_WIDGETS);
  base.admin = ['admin-stats', 'admin-activity', 'admin-quick-links', 'admin-user'];
  return base;
})();

/** Space-keyed default widgets for admin — admin space added explicitly */
const ADMIN_SPACE_WIDGETS: UserWidgets = (() => {
  const base = remapToSpaces(ADMIN_USER_WIDGETS);
  base.admin = ['admin-stats', 'admin-user'];
  return base;
})();

/** Space-keyed default layouts per role */
const RESIDENT_SPACE_LAYOUTS: WidgetLayouts = remapLayoutsToSpaces(RESIDENT_LAYOUTS);
const BOARD_SPACE_LAYOUTS: WidgetLayouts = remapLayoutsToSpaces(BOARD_LAYOUTS);
const ADMIN_SPACE_LAYOUTS: WidgetLayouts = (() => {
  const base = remapLayoutsToSpaces(ADMIN_LAYOUTS);
  base.admin = {
    'admin-stats': { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'admin-user': { x: 0, y: 2, width: 4, height: 3, isCollapsed: false },
  };
  return base;
})();

/**
 * Default widget lists per space, keyed by user role.
 * Used when NEXT_PUBLIC_FOCUS_SPACES is enabled.
 */
export const SPACE_DEFAULT_USER_WIDGETS: Record<string, UserWidgets> = {
  RESIDENT: RESIDENT_SPACE_WIDGETS,
  BOARD: BOARD_SPACE_WIDGETS,
  COMMITTEE: BOARD_SPACE_WIDGETS,
  ADMIN: ADMIN_SPACE_WIDGETS,
  MANAGER: ADMIN_SPACE_WIDGETS,
};

/**
 * Default widget layout positions per space, keyed by user role.
 * Used when NEXT_PUBLIC_FOCUS_SPACES is enabled.
 */
export const SPACE_DEFAULT_LAYOUTS: Record<string, WidgetLayouts> = {
  RESIDENT: RESIDENT_SPACE_LAYOUTS,
  BOARD: BOARD_SPACE_LAYOUTS,
  COMMITTEE: BOARD_SPACE_LAYOUTS,
  ADMIN: ADMIN_SPACE_LAYOUTS,
  MANAGER: ADMIN_SPACE_LAYOUTS,
};

/**
 * Get the default dashboard layout using space keys (Focus Spaces architecture).
 * Falls back to RESIDENT defaults if the role is not recognized.
 *
 * @param role - User role string (e.g. 'RESIDENT', 'ADMIN', 'BOARD')
 * @returns Default userWidgets and layouts keyed by spaceId
 */
export function getSpaceDefaultLayout(role: string): {
  userWidgets: UserWidgets;
  layouts: WidgetLayouts;
} {
  const normalized = role?.toUpperCase();
  const userWidgets =
    SPACE_DEFAULT_USER_WIDGETS[normalized] || SPACE_DEFAULT_USER_WIDGETS['RESIDENT'];
  const layouts = SPACE_DEFAULT_LAYOUTS[normalized] || SPACE_DEFAULT_LAYOUTS['RESIDENT'];
  return { userWidgets, layouts };
}
