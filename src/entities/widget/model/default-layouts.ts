/**
 * Default Dashboard Layouts (Space-keyed)
 *
 * DISCOVERY ANSWERS (confirmed from source):
 *
 * Q1 — Layout item shape:
 * WidgetLayout = { x: number; y: number; width: number; height: number;
 * isCollapsed: boolean; lastHeight?: number }
 * WidgetLayouts = { [spaceId: string]: { [widgetId: string]: WidgetLayout } }
 * UserWidgets = { [spaceId: string]: string[] }
 *
 * Q2 — Layout storage on user:
 * dashboardLayout is `string | null` where the string is
 * JSON.stringify({ layouts: WidgetLayouts, userWidgets: UserWidgets })
 * Both maps are keyed by spaceId.
 *
 * Q3 — Space identifiers (5 Focus Spaces):
 * home, services, community, messages, admin
 *
 * Q4 — dashboardLayout storage on user:
 * `string | null` — JSON.stringify({ layouts, userWidgets })
 * Hydrated via widget-store.ts hydrateFromDatabase(), persisted via saveToDatabase()
 */

import type { WidgetLayouts, UserWidgets } from '@entities/widget';

// ═══════════════════════════════════════════════════════════════
// RESIDENT DEFAULT LAYOUT
// ═══════════════════════════════════════════════════════════════

const RESIDENT_USER_WIDGETS: UserWidgets = {
  home: ['stats', 'quick-actions', 'notifications', 'recent-activity', 'events', 'messages'],
  providers: [
    'provider-overview',
    'provider-analytics',
    'provider-listings',
    'provider-credit-progress',
    'provider-inquiries',
  ],
  services: ['maintenance-requests', 'events', 'notifications', 'my-services', 'service-inquiries'],
  community: [
    'my-content',
    'my-album',
    'media',
    'bookshelf',
    'premium-portfolio',
    'agent-dashboard',
    'agent-activity',
    'community-graph-widget',
  ],
  messages: ['messages', 'notifications'],
};

const RESIDENT_LAYOUTS: WidgetLayouts = {
  home: {
    stats: { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'quick-actions': { x: 0, y: 2, width: 2, height: 2, isCollapsed: false },
    notifications: { x: 2, y: 2, width: 2, height: 2, isCollapsed: false },
    'recent-activity': { x: 0, y: 4, width: 4, height: 2, isCollapsed: false },
    events: { x: 0, y: 6, width: 2, height: 2, isCollapsed: false },
    messages: { x: 2, y: 6, width: 2, height: 2, isCollapsed: false },
  },
  providers: {
    'provider-overview': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    'provider-analytics': { x: 0, y: 3, width: 4, height: 3, isCollapsed: false },
    'provider-listings': { x: 0, y: 6, width: 4, height: 3, isCollapsed: false },
    'provider-credit-progress': { x: 0, y: 9, width: 4, height: 2, isCollapsed: false },
    'provider-inquiries': { x: 0, y: 11, width: 4, height: 2, isCollapsed: false },
  },
  services: {
    'maintenance-requests': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    events: { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    notifications: { x: 0, y: 2, width: 4, height: 2, isCollapsed: false },
    'my-services': { x: 0, y: 0, width: 2, height: 2, isCollapsed: false },
    'service-inquiries': { x: 2, y: 0, width: 2, height: 2, isCollapsed: false },
  },
  community: {
    'my-content': { x: 0, y: 0, width: 2, height: 2, isCollapsed: false },
    'my-album': { x: 2, y: 0, width: 2, height: 2, isCollapsed: false },
    media: { x: 0, y: 2, width: 2, height: 2, isCollapsed: false },
    bookshelf: { x: 2, y: 2, width: 2, height: 2, isCollapsed: false },
    'premium-portfolio': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    'agent-dashboard': { x: 0, y: 3, width: 2, height: 3, isCollapsed: false },
    'agent-activity': { x: 2, y: 3, width: 2, height: 3, isCollapsed: false },
    'community-graph-widget': { x: 0, y: 6, width: 4, height: 3, isCollapsed: false },
  },
  messages: {},
};

// ═══════════════════════════════════════════════════════════════
// BOARD / COMMITTEE DEFAULT LAYOUT
// ═══════════════════════════════════════════════════════════════

const BOARD_USER_WIDGETS: UserWidgets = {
  home: ['admin-stats', 'admin-quick-links', 'admin-activity', 'notifications', 'recent-activity'],
  providers: [
    'provider-overview',
    'provider-analytics',
    'provider-listings',
    'provider-credit-progress',
    'provider-inquiries',
  ],
  services: ['maintenance-list', 'events', 'my-services', 'service-inquiries'],
  community: [
    'admin-events',
    'admin-surveys',
    'group-moderation',
    'premium-portfolio',
    'agent-dashboard',
  ],
  messages: ['messages', 'notifications'],
  admin: ['admin-stats', 'admin-activity', 'admin-quick-links', 'admin-user'],
};

const BOARD_LAYOUTS: WidgetLayouts = {
  home: {
    'admin-stats': { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'admin-quick-links': { x: 0, y: 2, width: 1, height: 2, isCollapsed: false },
    'admin-activity': { x: 1, y: 2, width: 2, height: 3, isCollapsed: false },
    notifications: { x: 3, y: 2, width: 1, height: 2, isCollapsed: false },
    'recent-activity': { x: 0, y: 5, width: 4, height: 2, isCollapsed: false },
  },
  providers: {
    'provider-overview': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    'provider-analytics': { x: 0, y: 3, width: 4, height: 3, isCollapsed: false },
    'provider-listings': { x: 0, y: 6, width: 4, height: 3, isCollapsed: false },
    'provider-credit-progress': { x: 0, y: 9, width: 4, height: 2, isCollapsed: false },
    'provider-inquiries': { x: 0, y: 11, width: 4, height: 2, isCollapsed: false },
  },
  services: {
    'maintenance-list': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    events: { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'my-services': { x: 0, y: 0, width: 2, height: 2, isCollapsed: false },
    'service-inquiries': { x: 2, y: 0, width: 2, height: 2, isCollapsed: false },
  },
  community: {
    'admin-events': { x: 0, y: 0, width: 2, height: 2, isCollapsed: false },
    'admin-surveys': { x: 2, y: 0, width: 2, height: 2, isCollapsed: false },
    'group-moderation': { x: 0, y: 2, width: 4, height: 3, isCollapsed: false },
    'premium-portfolio': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    'agent-dashboard': { x: 0, y: 3, width: 4, height: 3, isCollapsed: false },
  },
  messages: {},
  admin: {
    'admin-stats': { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'admin-activity': { x: 1, y: 2, width: 2, height: 3, isCollapsed: false },
    'admin-quick-links': { x: 0, y: 2, width: 1, height: 2, isCollapsed: false },
    'admin-user': { x: 3, y: 2, width: 1, height: 3, isCollapsed: false },
  },
};

// ═══════════════════════════════════════════════════════════════
// ADMIN / MANAGER DEFAULT LAYOUT
// ═══════════════════════════════════════════════════════════════

const ADMIN_USER_WIDGETS: UserWidgets = {
  home: ['admin-stats', 'admin-quick-links', 'admin-user', 'admin-activity'],
  providers: [
    'provider-overview',
    'provider-analytics',
    'provider-listings',
    'provider-credit-progress',
    'provider-inquiries',
  ],
  services: ['maintenance-list', 'maintenance-analytics', 'events', 'admin-resources'],
  community: [
    'admin-content',
    'admin-events',
    'admin-surveys',
    'admin-competitions',
    'admin-system',
    'page-settings',
  ],
  messages: ['messages', 'notifications'],
  admin: ['admin-stats', 'admin-user'],
};

const ADMIN_LAYOUTS: WidgetLayouts = {
  home: {
    'admin-stats': { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'admin-quick-links': { x: 0, y: 2, width: 1, height: 2, isCollapsed: false },
    'admin-user': { x: 1, y: 2, width: 2, height: 3, isCollapsed: false },
    'admin-activity': { x: 3, y: 2, width: 1, height: 3, isCollapsed: false },
  },
  providers: {
    'provider-overview': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    'provider-analytics': { x: 0, y: 3, width: 4, height: 3, isCollapsed: false },
    'provider-listings': { x: 0, y: 6, width: 4, height: 3, isCollapsed: false },
    'provider-credit-progress': { x: 0, y: 9, width: 4, height: 2, isCollapsed: false },
    'provider-inquiries': { x: 0, y: 11, width: 4, height: 2, isCollapsed: false },
  },
  services: {
    'maintenance-list': { x: 0, y: 0, width: 2, height: 3, isCollapsed: false },
    'maintenance-analytics': { x: 2, y: 0, width: 2, height: 3, isCollapsed: false },
    events: { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'admin-resources': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
  },
  community: {
    'admin-content': { x: 0, y: 0, width: 2, height: 2, isCollapsed: false },
    'admin-events': { x: 2, y: 0, width: 2, height: 2, isCollapsed: false },
    'admin-surveys': { x: 0, y: 2, width: 2, height: 2, isCollapsed: false },
    'admin-competitions': { x: 2, y: 2, width: 2, height: 2, isCollapsed: false },
    'admin-system': { x: 0, y: 0, width: 4, height: 3, isCollapsed: false },
    'page-settings': { x: 0, y: 3, width: 4, height: 3, isCollapsed: false },
  },
  messages: {},
  admin: {
    'admin-stats': { x: 0, y: 0, width: 4, height: 2, isCollapsed: false },
    'admin-user': { x: 0, y: 2, width: 4, height: 3, isCollapsed: false },
  },
};

// ═══════════════════════════════════════════════════════════════
// EXPORTED DEFAULT LAYOUTS (keyed by role)
// ═══════════════════════════════════════════════════════════════

/**
 * Default widget lists per space, keyed by user role.
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
 * Default widget layout positions per space, keyed by user role.
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
 * @returns Default userWidgets and layouts keyed by spaceId
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
