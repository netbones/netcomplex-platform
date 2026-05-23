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

// ═══════════════════════════════════════════════════════════════
// RESIDENT DEFAULT LAYOUT
// ═══════════════════════════════════════════════════════════════

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
