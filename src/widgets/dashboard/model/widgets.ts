/**
 * Widget Registry - All widget registrations with lazy loading
 * This is the ONLY file that calls registry.register()
 * Import this file to auto-register all widgets
 */

import { lazy, Suspense } from 'react';
import { registry } from './registry';
import type { WidgetManifest } from './types';

// Import Lucide icons
import {
  BarChart2,
  Zap,
  Activity,
  Bell,
  MessageSquare,
  Calendar,
  FileText,
  BookOpen,
  Image,
  Grid,
  Star,
  Home,
  Briefcase,
  Layers,
  Send,
  User,
  Settings,
} from 'lucide-react';

// Helper to register widget with manifest
function registerWidget(manifest: WidgetManifest) {
  registry.register(manifest);
}

// ═══════════════════════════════════════════════════════════════
// CORE WIDGETS
// ═══════════════════════════════════════════════════════════════

registerWidget({
  id: 'stats',
  version: '1.0.0',
  name: 'Dashboard Stats',
  description: 'Overview statistics for the dashboard',
  author: 'internal',
  category: 'core',
  icon: BarChart2,
  component: lazy(() => import('../ui/DashboardStats').then(m => ({ default: m.DashboardStats }))),
  loader: () => import('../ui/DashboardStats'),
  defaultSize: { width: 4, height: 2 },
  minSize: { width: 2, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'quick-actions',
  version: '1.0.0',
  name: 'Quick Actions',
  description: 'Common actions and shortcuts',
  author: 'internal',
  category: 'core',
  icon: Zap,
  component: lazy(() =>
    import('../ui/QuickActionsWidget').then(m => ({ default: m.QuickActionsWidget }))
  ),
  loader: () => import('../ui/QuickActionsWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'recent-activity',
  version: '1.0.0',
  name: 'Recent Activity',
  description: 'Recent user activities and updates',
  author: 'internal',
  category: 'core',
  icon: Activity,
  component: lazy(() =>
    import('../ui/RecentActivityWidget').then(m => ({ default: m.RecentActivityWidget }))
  ),
  loader: () => import('../ui/RecentActivityWidget'),
  defaultSize: { width: 3, height: 3 },
  minSize: { width: 2, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'solo-seat',
  version: '1.0.0',
  name: 'Solo Seat',
  description: 'Solo seat member profile',
  author: 'internal',
  category: 'core',
  icon: User,
  component: lazy(() => import('../ui/SoloSeatWidget').then(m => ({ default: m.SoloSeatWidget }))),
  loader: () => import('../ui/SoloSeatWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'properties',
  version: '1.0.0',
  name: 'Properties',
  description: 'Property asset and occupancy management',
  author: 'internal',
  category: 'core',
  icon: Home,
  featureFlag: 'households',
  component: lazy(() =>
    import('../ui/PropertiesWidget').then(m => ({ default: m.PropertiesWidget }))
  ),
  loader: () => import('../ui/PropertiesWidget'),
  defaultSize: { width: 3, height: 2 },
  minSize: { width: 2, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

// ═══════════════════════════════════════════════════════════════
// COMMUNICATION WIDGETS
// ═══════════════════════════════════════════════════════════════

registerWidget({
  id: 'notifications',
  version: '1.0.0',
  name: 'Notifications',
  description: 'User notifications and alerts',
  author: 'internal',
  category: 'communication',
  icon: Bell,
  component: lazy(() =>
    import('../ui/NotificationsWidget').then(m => ({ default: m.NotificationsWidget }))
  ),
  loader: () => import('../ui/NotificationsWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'messages',
  version: '1.0.0',
  name: 'Messages',
  description: 'Recent messages and conversations',
  author: 'internal',
  category: 'communication',
  icon: MessageSquare,
  component: lazy(() => import('@widgets/chat').then(m => ({ default: m.MessagesWidget }))),
  loader: () => import('@widgets/chat'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

// ═══════════════════════════════════════════════════════════════
// CONTENT WIDGETS
// ═══════════════════════════════════════════════════════════════

registerWidget({
  id: 'events',
  version: '1.0.0',
  name: 'Events',
  description: 'Upcoming community events',
  author: 'internal',
  category: 'content',
  icon: Calendar,
  component: lazy(() => import('../ui/EventsWidget').then(m => ({ default: m.EventsWidget }))),
  loader: () => import('../ui/EventsWidget'),
  defaultSize: { width: 3, height: 2 },
  minSize: { width: 2, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'my-content',
  version: '1.0.0',
  name: 'My Content',
  description: "User's published content",
  author: 'internal',
  category: 'content',
  icon: FileText,
  component: lazy(() =>
    import('../ui/UserContentWidget').then(m => ({ default: m.UserContentWidget }))
  ),
  loader: () => import('../ui/UserContentWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'bookshelf',
  version: '1.0.0',
  name: 'Bookshelf',
  description: "User's book collection",
  author: 'internal',
  category: 'content',
  icon: BookOpen,
  component: lazy(() =>
    import('../ui/BookshelfWidget').then(m => ({ default: m.BookshelfWidget }))
  ),
  loader: () => import('../ui/BookshelfWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'media',
  version: '1.0.0',
  name: 'Media',
  description: 'Shared media gallery',
  author: 'internal',
  category: 'content',
  icon: Image,
  component: lazy(() => import('../ui/MediaWidget').then(m => ({ default: m.MediaWidget }))),
  loader: () => import('../ui/MediaWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'my-album',
  version: '1.0.0',
  name: 'My Album',
  description: "User's personal photo album",
  author: 'internal',
  category: 'content',
  icon: Grid,
  component: lazy(() => import('../ui/MyAlbumWidget').then(m => ({ default: m.MyAlbumWidget }))),
  loader: () => import('../ui/MyAlbumWidget'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'my-services',
  version: '1.0.0',
  name: 'My Services',
  description: 'Community services offered by user',
  author: 'internal',
  category: 'content',
  icon: Briefcase,
  featureFlag: 'services',
  component: lazy(() => import('@widgets/service').then(m => ({ default: m.MyServicesWidget }))),
  loader: () => import('@widgets/service'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'service-inquiries',
  version: '1.0.0',
  name: 'Service Inquiries',
  description: 'Inquiries received for community services',
  author: 'internal',
  category: 'content',
  icon: Send,
  featureFlag: 'services',
  component: lazy(() =>
    import('@widgets/service').then(m => ({ default: m.ServiceInquiriesWidget }))
  ),
  loader: () => import('@widgets/service'),
  defaultSize: { width: 2, height: 2 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

// ═══════════════════════════════════════════════════════════════
// UTILITY WIDGETS
// ═══════════════════════════════════════════════════════════════

registerWidget({
  id: 'sidebar-widgets',
  version: '1.0.0',
  name: 'Sidebar Widgets',
  description: 'Container for sidebar widgets',
  author: 'internal',
  category: 'utility',
  icon: Grid,
  component: lazy(() =>
    import('../ui/SidebarWidgetBox').then(m => ({ default: m.SidebarWidgetBox }))
  ),
  loader: () => import('../ui/SidebarWidgetBox'),
  defaultSize: { width: 1, height: 3 },
  minSize: { width: 1, height: 1 },
  dragHandleClassName: 'widget-drag-handle',
});

// ═══════════════════════════════════════════════════════════════
// PREMIUM WIDGETS
// ═══════════════════════════════════════════════════════════════

registerWidget({
  id: 'premium-portfolio',
  version: '1.0.0',
  name: 'Premium Portfolio',
  description: 'Portfolio management for premium members',
  author: 'netcomplex-premium',
  category: 'premium',
  icon: Star,
  premium: true,
  featureFlag: 'portfolio',
  component: lazy(() =>
    import('../ui/PremiumPortfolioWidget').then(m => ({ default: m.PremiumPortfolioWidget }))
  ),
  loader: () => import('../ui/PremiumPortfolioWidget'),
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 2, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'agent-dashboard',
  version: '1.0.0',
  name: 'Agent Dashboard',
  description: 'Real estate agent tools and metrics',
  author: 'netcomplex-premium',
  category: 'premium',
  icon: Briefcase,
  premium: true,
  featureFlag: 'agents',
  permissions: ['agent', 'admin'],
  component: lazy(() =>
    import('../ui/AgentDashboardWidget').then(m => ({ default: m.AgentDashboardWidget }))
  ),
  loader: () => import('../ui/AgentDashboardWidget'),
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 2, height: 2 },
  dragHandleClassName: 'widget-drag-handle',
});

registerWidget({
  id: 'community-graph-widget',
  version: '1.0.0',
  name: 'Community Graph',
  description: 'Visualization of community connections',
  author: 'netcomplex-premium',
  category: 'premium',
  icon: Layers,
  premium: true,
  featureFlag: 'communityGraph',
  component: lazy(() =>
    import('../ui/CommunityGraphWidget').then(m => ({ default: m.CommunityGraphWidget }))
  ),
  loader: () => import('../ui/CommunityGraphWidget'),
  defaultSize: { width: 4, height: 4 },
  minSize: { width: 3, height: 3 },
  dragHandleClassName: 'widget-drag-handle',
});

// Export for convenience - count of registered widgets
export const WIDGET_COUNT = registry.list().length;
