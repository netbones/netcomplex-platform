import { DashboardTab } from '@/components/dashboard/DashboardTabs';

export interface AdminWidget {
  id: string;
  label: string;
  icon: string;
}

export const ADMIN_TABS: DashboardTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'fa-th-large',
    defaultWidgets: ['admin-stats', 'admin-quick-links', 'admin-activity'],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: 'fa-tools',
    defaultWidgets: ['maintenance-requests', 'maintenance-analytics'],
  },
  {
    id: 'users',
    label: 'User Management',
    icon: 'fa-users',
    defaultWidgets: ['admin-users', 'admin-stats', 'admin-activity'],
  },
  {
    id: 'content',
    label: 'Content Management',
    icon: 'fa-file-alt',
    defaultWidgets: ['admin-content', 'admin-stats', 'admin-quick-links'],
  },
  {
    id: 'system',
    label: 'System',
    icon: 'fa-cog',
    defaultWidgets: ['admin-system', 'admin-activity', 'admin-quick-links'],
  },
  {
    id: 'settings',
    label: 'Page Settings',
    icon: 'fa-toggle-on',
    defaultWidgets: ['page-settings'],
  },
];

export const ALL_ADMIN_WIDGETS: AdminWidget[] = [
  { id: 'admin-stats', label: 'System Statistics', icon: 'fa-chart-bar' },
  { id: 'admin-quick-links', label: 'Quick Actions', icon: 'fa-bolt' },
  { id: 'admin-activity', label: 'Recent Activity', icon: 'fa-clock' },
  { id: 'admin-users', label: 'User Overview', icon: 'fa-users' },
  { id: 'admin-content', label: 'Content Overview', icon: 'fa-file-alt' },
  { id: 'admin-system', label: 'System Status', icon: 'fa-cog' },
  { id: 'moderation-queue', label: 'Moderation Queue', icon: 'fa-shield-alt' },
  { id: 'marketplace-analytics', label: 'Marketplace Analytics', icon: 'fa-store' },
  { id: 'service-quality', label: 'Service Quality', icon: 'fa-star' },
  { id: 'maintenance-requests', label: 'Maintenance Requests', icon: 'fa-tools' },
  { id: 'maintenance-analytics', label: 'Maintenance Analytics', icon: 'fa-chart-line' },
  { id: 'page-settings', label: 'Page Visibility', icon: 'fa-toggle-on' },
];

export function getWidgetTitle(widgetId: string): string {
  const widget = ALL_ADMIN_WIDGETS.find(w => w.id === widgetId);
  return widget?.label || widgetId;
}

export function getWidgetIcon(widgetId: string): string {
  const widget = ALL_ADMIN_WIDGETS.find(w => w.id === widgetId);
  return widget?.icon || 'fa-widget';
}

export function getAdminWidgetSize(widgetId: string): 'small' | 'medium' | 'large' {
  switch (widgetId) {
    case 'admin-stats':
    case 'admin-activity':
    case 'admin-users':
    case 'admin-content':
    case 'admin-system':
    case 'maintenance-analytics':
      return 'large';
    case 'admin-quick-links':
    case 'maintenance-requests':
      return 'medium';
    default:
      return 'medium';
  }
}

export function getAvailableAdminWidgets(activeWidgetIds: string[]): AdminWidget[] {
  return ALL_ADMIN_WIDGETS.filter(w => !activeWidgetIds.includes(w.id));
}
