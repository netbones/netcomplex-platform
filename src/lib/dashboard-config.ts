export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  icon: string;
  label: string;
}

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

export function getAvailableWidgets(activeWidgetIds: string[]): DashboardWidget[] {
  return ALL_WIDGETS.filter(w => !activeWidgetIds.includes(w.id));
}
