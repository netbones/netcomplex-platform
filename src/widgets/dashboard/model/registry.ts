import { ComponentType } from 'react';
import { DashboardStats } from '../ui/DashboardStats';
import { QuickActionsWidget } from '../ui/QuickActionsWidget';
import { RecentActivityWidget } from '../ui/RecentActivityWidget';
import { EventsWidget } from '../ui/EventsWidget';
import { NotificationsWidget } from '../ui/NotificationsWidget';
import { MessagesWidget } from '@widgets/chat';
import { UserContentWidget } from '../ui/UserContentWidget';
import { BookshelfWidget } from '../ui/BookshelfWidget';
import { MediaWidget } from '../ui/MediaWidget';
import { MyAlbumWidget } from '../ui/MyAlbumWidget';
import { SidebarWidgetBox } from '../ui/SidebarWidgetBox';
import { PremiumPortfolioWidget } from '../ui/PremiumPortfolioWidget';
import { PropertiesWidget } from '../ui/PropertiesWidget';
import { AgentDashboardWidget } from '../ui/AgentDashboardWidget';
import { SoloSeatWidget } from '../ui/SoloSeatWidget';
import { MyServicesWidget, ServiceInquiriesWidget } from '@widgets/service';
import { CommunityGraphWidget } from '../ui/CommunityGraphWidget';

/**
 * Widget registry entry
 */
export interface WidgetRegistryEntry {
  /** Unique widget identifier */
  id: string;
  /** Display name for admin UI */
  name: string;
  /** Description for admin UI */
  description?: string;
  /** Feature flag required to render (optional) */
  featureFlag?: string;
  /** Whether this is a premium/paid widget */
  premium?: boolean;
  /** Category for organizing widgets in admin */
  category?: 'core' | 'content' | 'communication' | 'premium' | 'utility';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WidgetComponent = ComponentType<any>;

/**
 * Complete widget registry mapping widget IDs to their components and metadata
 */
export const WIDGET_REGISTRY: Record<
  string,
  { component: WidgetComponent; metadata: WidgetRegistryEntry }
> = {
  stats: {
    component: DashboardStats,
    metadata: {
      id: 'stats',
      name: 'Dashboard Stats',
      description: 'Overview statistics for the dashboard',
      category: 'core',
    },
  },
  'quick-actions': {
    component: QuickActionsWidget,
    metadata: {
      id: 'quick-actions',
      name: 'Quick Actions',
      description: 'Common actions and shortcuts',
      category: 'core',
    },
  },
  'recent-activity': {
    component: RecentActivityWidget,
    metadata: {
      id: 'recent-activity',
      name: 'Recent Activity',
      description: 'Recent user activities and updates',
      category: 'core',
    },
  },
  notifications: {
    component: NotificationsWidget,
    metadata: {
      id: 'notifications',
      name: 'Notifications',
      description: 'User notifications and alerts',
      category: 'communication',
    },
  },
  messages: {
    component: MessagesWidget,
    metadata: {
      id: 'messages',
      name: 'Messages',
      description: 'Recent messages and conversations',
      category: 'communication',
    },
  },
  events: {
    component: EventsWidget,
    metadata: {
      id: 'events',
      name: 'Events',
      description: 'Upcoming community events',
      category: 'content',
    },
  },
  'my-content': {
    component: UserContentWidget,
    metadata: {
      id: 'my-content',
      name: 'My Content',
      description: "User's published content",
      category: 'content',
    },
  },
  bookshelf: {
    component: BookshelfWidget,
    metadata: {
      id: 'bookshelf',
      name: 'Bookshelf',
      description: "User's book collection",
      category: 'content',
    },
  },
  media: {
    component: MediaWidget,
    metadata: {
      id: 'media',
      name: 'Media',
      description: 'Shared media gallery',
      category: 'content',
    },
  },
  'my-album': {
    component: MyAlbumWidget,
    metadata: {
      id: 'my-album',
      name: 'My Album',
      description: "User's personal photo album",
      category: 'content',
    },
  },
  'sidebar-widgets': {
    component: SidebarWidgetBox,
    metadata: {
      id: 'sidebar-widgets',
      name: 'Sidebar Widgets',
      description: 'Container for sidebar widgets',
      category: 'utility',
    },
  },
  'premium-portfolio': {
    component: PremiumPortfolioWidget,
    metadata: {
      id: 'premium-portfolio',
      name: 'Premium Portfolio',
      description: 'Portfolio management for premium members',
      premium: true,
      featureFlag: 'portfolio',
      category: 'premium',
    },
  },
  properties: {
    component: PropertiesWidget,
    metadata: {
      id: 'properties',
      name: 'Properties',
      description: 'Property asset and occupancy management',
      featureFlag: 'households',
      category: 'core',
    },
  },
  'agent-dashboard': {
    component: AgentDashboardWidget,
    metadata: {
      id: 'agent-dashboard',
      name: 'Agent Dashboard',
      description: 'Real estate agent tools and metrics',
      featureFlag: 'agents',
      premium: true,
      category: 'premium',
    },
  },
  'solo-seat': {
    component: SoloSeatWidget,
    metadata: {
      id: 'solo-seat',
      name: 'Solo Seat',
      description: 'Solo seat member profile',
      category: 'core',
    },
  },
  'my-services': {
    component: MyServicesWidget,
    metadata: {
      id: 'my-services',
      name: 'My Services',
      description: 'Community services offered by user',
      featureFlag: 'services',
      category: 'content',
    },
  },
  'service-inquiries': {
    component: ServiceInquiriesWidget,
    metadata: {
      id: 'service-inquiries',
      name: 'Service Inquiries',
      description: 'Inquiries received for community services',
      featureFlag: 'services',
      category: 'content',
    },
  },
  'community-graph-widget': {
    component: CommunityGraphWidget,
    metadata: {
      id: 'community-graph-widget',
      name: 'Community Graph',
      description: 'Visualization of community connections',
      featureFlag: 'communityGraph',
      premium: true,
      category: 'premium',
    },
  },
};

/**
 * Get all registered widget metadata (for admin UI)
 */
export function getAllWidgets(): WidgetRegistryEntry[] {
  return Object.values(WIDGET_REGISTRY).map(w => w.metadata);
}

/**
 * Get widget component by ID
 * @param widgetId - The widget identifier
 * @returns The widget component or undefined if not found
 */
export function getWidgetComponent(widgetId: string): WidgetComponent | undefined {
  return WIDGET_REGISTRY[widgetId]?.component;
}

/**
 * Get widget metadata by ID
 * @param widgetId - The widget identifier
 * @returns The widget metadata or undefined if not found
 */
export function getWidgetMetadata(widgetId: string): WidgetRegistryEntry | undefined {
  return WIDGET_REGISTRY[widgetId]?.metadata;
}

/**
 * Check if a widget exists in the registry
 * @param widgetId - The widget identifier
 * @returns true if widget exists
 */
export function hasWidget(widgetId: string): boolean {
  return widgetId in WIDGET_REGISTRY;
}

/**
 * Get widgets by category
 * @param category - The category to filter by
 * @returns Array of widget metadata in the category
 */
export function getWidgetsByCategory(category: string): WidgetRegistryEntry[] {
  return Object.values(WIDGET_REGISTRY)
    .map(w => w.metadata)
    .filter(w => w.category === category);
}

/**
 * Get premium widgets
 * @returns Array of premium widget metadata
 */
export function getPremiumWidgets(): WidgetRegistryEntry[] {
  return Object.values(WIDGET_REGISTRY)
    .map(w => w.metadata)
    .filter(w => w.premium);
}
