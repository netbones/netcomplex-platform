import type { Tenant } from '@entities/tenant';
import { isFeatureEnabled, TierLevel } from '@entities/tenant/api/features/registry';

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  icon: string;
  label: string;
}

/**
 * Maps widget IDs to feature keys for FeatureGate integration.
 * Widgets will only render if the tenant has access to the mapped feature.
 * Utility widgets (no feature mapping) are available to all tenants.
 */
export const WIDGET_FEATURE_MAP: Record<string, string> = {
  'directory-widget': 'page.directory',
  'events-widget': 'page.events',
  'bookings-widget': 'page.bookings',
  'groups-widget': 'page.groups',
  'services-widget': 'page.marketplace',
  'property-widget': 'page.property',
  'maintenance-widget': 'page.maintenance',
  'surveys-widget': 'page.surveys',
  'chat-widget': 'page.chat',
  'analytics-widget': 'page.analytics',
  'news-widget': 'page.news',
  'conservation-widget': 'page.conservation',
  'bookshelf-widget': 'page.bookshelf',
  'agent-widget': 'page.property',
  'community-graph-widget': 'page.directory',
  // Utility widgets available to all tenants
  stats: 'page.dashboard',
  'quick-actions': 'page.dashboard',
  'recent-activity': 'page.dashboard',
  notifications: 'page.dashboard',
  'my-content': 'page.dashboard',
  bookshelf: 'page.bookshelf',
  media: 'page.media',
  'my-album': 'page.media',
  'sidebar-widgets': 'page.dashboard',
  'premium-portfolio': 'page.property',
  'my-services': 'page.marketplace',
  'service-inquiries': 'page.marketplace',
  'announcements-stream': 'page.news',
  // Maintenance widgets
  'maintenance-requests': 'page.maintenance',
  'maintenance-list': 'page.maintenance',
  'maintenance-analytics': 'page.maintenance',
  // Admin core widgets
  'admin-stats': 'page.dashboard',
  'admin-activity': 'page.dashboard',
  'admin-quick-links': 'page.dashboard',
  'admin-content': 'page.dashboard',
  'admin-user': 'page.dashboard',
  'admin-system': 'page.dashboard',
};

export const ALL_WIDGETS: DashboardWidget[] = [
  { id: 'stats', type: 'stats', title: 'Statistics', icon: 'fa-chart-bar', label: 'Statistics' },
  {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Quick Actions',
    icon: 'fa-bolt',
    label: 'Quick Actions',
  },
  {
    id: 'recent-activity',
    type: 'recent-activity',
    title: 'Recent Activity',
    icon: 'fa-clock',
    label: 'Recent Activity',
  },
  {
    id: 'notifications',
    type: 'notifications',
    title: 'Notifications',
    icon: 'fa-bell',
    label: 'Notifications',
  },
  {
    id: 'events',
    type: 'events',
    title: 'Community Events',
    icon: 'fa-calendar',
    label: 'Community Events',
  },
  { id: 'messages', type: 'messages', title: 'Messages', icon: 'fa-envelope', label: 'Messages' },
  {
    id: 'my-content',
    type: 'my-content',
    title: 'My Content',
    icon: 'fa-file-alt',
    label: 'My Content',
  },
  {
    id: 'bookshelf',
    type: 'bookshelf',
    title: 'My Bookshelf',
    icon: 'fa-book',
    label: 'My Bookshelf',
  },
  {
    id: 'media',
    type: 'media',
    title: 'Media Gallery',
    icon: 'fa-images',
    label: 'Media Gallery',
  },
  {
    id: 'my-album',
    type: 'my-album',
    title: 'My Albums',
    icon: 'fa-photo-video',
    label: 'My Albums',
  },
  {
    id: 'sidebar-widgets',
    type: 'sidebar-widgets',
    title: 'Sidebar Widgets',
    icon: 'fa-columns',
    label: 'Sidebar Widgets',
  },
  {
    id: 'premium-portfolio',
    type: 'premium-portfolio',
    title: 'Premium Portfolio',
    icon: 'fa-building',
    label: 'Premium Portfolio',
  },
  {
    id: 'my-services',
    type: 'my-services',
    title: 'My Services',
    icon: 'fa-briefcase',
    label: 'My Services',
  },
  {
    id: 'service-inquiries',
    type: 'service-inquiries',
    title: 'Service Inquiries',
    icon: 'fa-envelope-open-text',
    label: 'Service Inquiries',
  },
  {
    id: 'community-graph-widget',
    type: 'community-graph',
    title: 'Community Graph',
    icon: 'fa-project-diagram',
    label: 'Community Graph',
  },
  {
    id: 'announcements-stream',
    type: 'announcements-stream',
    title: 'Announcements',
    icon: 'fa-bullhorn',
    label: 'Announcements',
  },
  // Maintenance widgets
  {
    id: 'maintenance-requests',
    type: 'maintenance-requests',
    title: 'Maintenance Requests',
    icon: 'fa-wrench',
    label: 'Maintenance Requests',
  },
  {
    id: 'maintenance-list',
    type: 'maintenance-list',
    title: 'Maintenance List',
    icon: 'fa-clipboard-list',
    label: 'Maintenance List',
  },
  {
    id: 'maintenance-analytics',
    type: 'maintenance-analytics',
    title: 'Maintenance Analytics',
    icon: 'fa-chart-line',
    label: 'Maintenance Analytics',
  },
  // Admin core widgets
  {
    id: 'admin-stats',
    type: 'admin-stats',
    title: 'Admin Statistics',
    icon: 'fa-chart-bar',
    label: 'Admin Statistics',
  },
  {
    id: 'admin-activity',
    type: 'admin-activity',
    title: 'Admin Activity',
    icon: 'fa-activity',
    label: 'Admin Activity',
  },
  {
    id: 'admin-quick-links',
    type: 'admin-quick-links',
    title: 'Admin Quick Links',
    icon: 'fa-bolt',
    label: 'Admin Quick Links',
  },
  {
    id: 'admin-content',
    type: 'admin-content',
    title: 'Admin Content',
    icon: 'fa-file-alt',
    label: 'Admin Content',
  },
  {
    id: 'admin-user',
    type: 'admin-user',
    title: 'Admin Users',
    icon: 'fa-users',
    label: 'Admin Users',
  },
  {
    id: 'admin-system',
    type: 'admin-system',
    title: 'Admin System',
    icon: 'fa-cog',
    label: 'Admin System',
  },
];

export function getWidgetById(id: string): DashboardWidget | undefined {
  return ALL_WIDGETS.find(w => w.id === id);
}

export function getWidgetTitle(widgetId: string): string {
  const widget = getWidgetById(widgetId);
  return widget?.title || widgetId;
}

export function getWidgetIcon(widgetId: string): string {
  const widget = getWidgetById(widgetId);
  return widget?.icon || 'fa-widget';
}

export function getAvailableWidgets(activeWidgetIds: string[], tenant?: Tenant): DashboardWidget[] {
  return ALL_WIDGETS.filter(w => {
    // If no tenant context, show all widgets (e.g., public pages)
    if (!tenant) return !activeWidgetIds.includes(w.id);

    // Utility widgets available to all tenants (no feature restriction)
    const featureKey = WIDGET_FEATURE_MAP[w.id];
    if (!featureKey) return !activeWidgetIds.includes(w.id);

    // Check if tenant has access to the feature
    return isFeatureEnabled(tenant, featureKey) && !activeWidgetIds.includes(w.id);
  });
}
