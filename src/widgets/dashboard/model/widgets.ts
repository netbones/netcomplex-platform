/**
 * Widget Registry - All widget registrations with lazy loading
 * This is the ONLY file that calls registry.register()
 * Call registerAllWidgets() to register all widgets
 */

import { lazy } from 'react';
import type { WidgetManifest } from './types';

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
  Users,
  Settings,
  Megaphone,
  Wrench,
  ClipboardList,
  Trophy,
  Shield,
  Sparkles,
  TrendingUp,
  Wallet,
  Scale,
  Gavel,
  UserCheck,
} from 'lucide-react';

export function registerAllWidgets(registry: { register: (m: WidgetManifest) => void }) {
  /**
   * Space assignments (Focus Spaces architecture — Phase 30-B)
   *
   * home: stats, quick-actions, recent-activity, notifications, solo-seat, properties
   * services: maintenance-requests, maintenance-list, maintenance-analytics, my-services, service-inquiries, events
   * community: events, announcements-stream, my-content, my-album, media, bookshelf,
   *   admin-events, admin-surveys, group-moderation, admin-announcements,
   *   admin-competitions, admin-resources, admin-content
   * messages: messages, notifications
   * admin: admin-stats, admin-activity, admin-quick-links, admin-user, admin-system, page-settings, admin-announcements
   *
   * Some widgets belong to multiple spaces:
   * notifications → ['home', 'messages']
   * events → ['services', 'community']
   * admin-announcements → ['community', 'admin']
   */

  // ═══════════════════════════════════════════════════════════════
  // CORE WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
    id: 'dwallet-summary',
    version: '1.0.0',
    name: 'My dWallet',
    description: 'Community value, consent status, and impact at a glance',
    author: 'internal',
    category: 'core',
    icon: Wallet,
    featureFlag: 'dWallet',
    component: lazy(() =>
      import('@entities/dwallet/ui/DWalletSummaryWidget').then(m => ({
        default: m.DWalletSummaryWidget,
      }))
    ),
    defaultSize: { width: 2, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home'],
  });

  registry.register({
    id: 'stats',
    version: '1.0.0',
    name: 'Dashboard Stats',
    description: 'Overview statistics for the dashboard',
    author: 'internal',
    category: 'core',
    icon: BarChart2,
    component: lazy(() =>
      import('../ui/DashboardStats').then(m => ({ default: m.DashboardStats }))
    ),
    defaultSize: { width: 4, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home'],
  });

  registry.register({
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
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home'],
  });

  registry.register({
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
    defaultSize: { width: 3, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home'],
  });

  registry.register({
    id: 'solo-seat',
    version: '1.0.0',
    name: 'Solo Seat',
    description: 'Solo seat member profile',
    author: 'internal',
    category: 'core',
    icon: User,
    component: lazy(() =>
      import('../ui/SoloSeatWidget').then(m => ({ default: m.SoloSeatWidget }))
    ),
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home'],
  });

  registry.register({
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
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home'],
  });

  registry.register({
    id: 'delegations',
    version: '1.0.0',
    name: 'My Delegations',
    description: 'Manage property delegations and agent permissions',
    author: 'internal',
    category: 'core',
    icon: UserCheck,
    component: lazy(() =>
      import('@widgets/delegation').then(m => ({
        default: m.DelegationWidget,
      }))
    ),
    defaultSize: { width: 3, height: 3 },
    minSize: { width: 1, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home'],
  });

  // ═══════════════════════════════════════════════════════════════
  // COMMUNICATION WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
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
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home', 'messages'],
  });

  registry.register({
    id: 'messages',
    version: '1.0.0',
    name: 'Messages',
    description: 'Recent messages and conversations',
    author: 'internal',
    category: 'communication',
    icon: MessageSquare,
    component: lazy(() => import('@widgets/chat').then(m => ({ default: m.MessagesWidget }))),
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['messages'],
  });

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
    id: 'provider-overview',
    version: '1.0.0',
    name: 'Provider Overview',
    description: 'Provider profile, verification status, and trust summary',
    author: 'internal',
    category: 'core',
    icon: Briefcase,
    component: lazy(() =>
      import('../ui/provider-widgets').then(m => ({ default: m.ProviderOverviewWidget }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['providers'],
  });

  registry.register({
    id: 'provider-inquiries',
    version: '1.0.0',
    name: 'Provider Inquiries',
    description: "Inquiry pipeline across the provider's own listings",
    author: 'internal',
    category: 'communication',
    icon: ClipboardList,
    component: lazy(() =>
      import('../ui/provider-widgets').then(m => ({ default: m.ProviderInquiriesWidget }))
    ),
    defaultSize: { width: 4, height: 2 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['providers'],
  });

  registry.register({
    id: 'provider-analytics',
    version: '1.0.0',
    name: 'Provider Analytics',
    description: 'Provider-scoped listing and inquiry analytics',
    author: 'internal',
    category: 'core',
    icon: BarChart2,
    component: lazy(() =>
      import('../ui/provider-widgets').then(m => ({ default: m.ProviderAnalyticsWidget }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['providers'],
  });

  registry.register({
    id: 'provider-listings',
    version: '1.0.0',
    name: 'Provider Listings',
    description: 'Summary of active provider listings',
    author: 'internal',
    category: 'core',
    icon: Layers,
    component: lazy(() =>
      import('../ui/provider-widgets').then(m => ({ default: m.ProviderListingsWidget }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['providers'],
  });

  registry.register({
    id: 'provider-reputation-progress',
    version: '1.0.0',
    name: 'Provider Credit Progress',
    description: 'Progress toward verified provider status',
    author: 'internal',
    category: 'core',
    icon: Shield,
    component: lazy(() =>
      import('../ui/provider-widgets').then(m => ({ default: m.ProviderReputationProgressWidget }))
    ),
    defaultSize: { width: 4, height: 2 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['providers'],
  });

  // ═══════════════════════════════════════════════════════════════
  // MAINTENANCE WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
    id: 'maintenance-requests',
    version: '1.0.0',
    name: 'Maintenance Requests',
    description: 'Open maintenance requests overview',
    author: 'internal',
    category: 'core',
    icon: Wrench,
    component: lazy(() =>
      import('@widgets/maintenance').then(m => ({
        default: m.MaintenanceRequestsWidget,
      }))
    ),
    defaultSize: { width: 3, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services'],
  });

  registry.register({
    id: 'maintenance-list',
    version: '1.0.0',
    name: 'Maintenance List',
    description: 'Full list of maintenance requests',
    author: 'internal',
    category: 'core',
    icon: ClipboardList,
    permissions: ['admin', 'board'],
    component: lazy(() =>
      import('@widgets/maintenance').then(m => ({
        default: m.MaintenanceList,
      }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services', 'admin'],
  });

  registry.register({
    id: 'maintenance-analytics',
    version: '1.0.0',
    name: 'Maintenance Analytics',
    description: 'Maintenance request trends and statistics',
    author: 'internal',
    category: 'core',
    icon: BarChart2,
    permissions: ['admin', 'board'],
    component: lazy(() =>
      import('@widgets/maintenance').then(m => ({
        default: m.MaintenanceAnalyticsWidget,
      }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services', 'admin'],
  });

  // ═══════════════════════════════════════════════════════════════
  // ADMIN CORE WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
    id: 'admin-stats',
    version: '1.0.0',
    name: 'Admin Statistics',
    description: 'Platform statistics and key metrics',
    author: 'internal',
    category: 'core',
    icon: BarChart2,
    permissions: ['admin'],
    component: lazy(() =>
      import('@widgets/admin').then(m => ({
        default: m.AdminStatsWidget,
      }))
    ),
    defaultSize: { width: 4, height: 2 },
    minSize: { width: 3, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'admin-activity',
    version: '1.0.0',
    name: 'Admin Activity',
    description: 'Recent admin activity feed',
    author: 'internal',
    category: 'core',
    icon: Activity,
    permissions: ['admin'],
    component: lazy(() =>
      import('@widgets/admin').then(m => ({
        default: m.AdminActivityWidget,
      }))
    ),
    defaultSize: { width: 3, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'admin-quick-links',
    version: '1.0.0',
    name: 'Admin Quick Links',
    description: 'Quick access to admin actions',
    author: 'internal',
    category: 'core',
    icon: Zap,
    permissions: ['admin'],
    component: lazy(() =>
      import('@widgets/admin').then(m => ({
        default: m.AdminQuickLinksWidget,
      }))
    ),
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'admin-content',
    version: '1.0.0',
    name: 'Admin Content',
    description: 'Content management overview',
    author: 'internal',
    category: 'core',
    icon: FileText,
    permissions: ['admin'],
    component: lazy(() =>
      import('@widgets/admin').then(m => ({
        default: m.AdminContentWidget,
      }))
    ),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community', 'admin'],
  });

  registry.register({
    id: 'admin-user',
    version: '1.0.0',
    name: 'Admin Users',
    description: 'User management overview',
    author: 'internal',
    category: 'core',
    icon: Users,
    permissions: ['admin'],
    component: lazy(() =>
      import('@widgets/admin').then(m => ({
        default: m.AdminUserWidget,
      }))
    ),
    defaultSize: { width: 3, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'admin-system',
    version: '1.0.0',
    name: 'Admin System',
    description: 'System health and configuration',
    author: 'internal',
    category: 'core',
    icon: Settings,
    permissions: ['admin'],
    component: lazy(() =>
      import('@widgets/admin').then(m => ({
        default: m.AdminSystemWidget,
      }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  // ═══════════════════════════════════════════════════════════════
  // CONTENT WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
    id: 'events',
    version: '1.0.0',
    name: 'Events',
    description: 'Upcoming community events',
    author: 'internal',
    category: 'content',
    icon: Calendar,
    component: lazy(() => import('../ui/EventsWidget').then(m => ({ default: m.EventsWidget }))),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services', 'community'],
  });

  registry.register({
    id: 'surveys',
    version: '1.0.0',
    name: 'Surveys',
    description: 'Active community surveys you can take',
    author: 'internal',
    category: 'content',
    icon: FileText,
    component: lazy(() => import('../ui/SurveysWidget').then(m => ({ default: m.SurveysWidget }))),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services'],
  });

  registry.register({
    id: 'competitions',
    version: '1.0.0',
    name: 'Competitions',
    description: 'Active community competitions you can join',
    author: 'internal',
    category: 'content',
    icon: Trophy,
    component: lazy(() =>
      import('../ui/CompetitionsWidget').then(m => ({ default: m.CompetitionsWidget }))
    ),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services'],
  });

  registry.register({
    id: 'announcements-stream',
    version: '1.0.0',
    name: 'Announcements',
    description: 'Recent community announcements',
    author: 'internal',
    category: 'communication',
    icon: Megaphone,
    component: lazy(() =>
      import('../ui/AnnouncementsStreamWidget').then(m => ({
        default: m.AnnouncementsStreamWidget,
      }))
    ),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community'],
  });

  registry.register({
    id: 'admin-events',
    version: '1.0.0',
    name: 'Admin Events',
    description: 'Management summary of community events',
    author: 'internal',
    category: 'core',
    icon: Calendar,
    permissions: ['admin'],
    component: lazy(() => import('@widgets/admin').then(m => ({ default: m.EventsWidget }))),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community', 'admin'],
  });

  registry.register({
    id: 'admin-surveys',
    version: '1.0.0',
    name: 'Admin Surveys',
    description: 'Management summary of community surveys',
    author: 'internal',
    category: 'core',
    icon: FileText,
    permissions: ['admin'],
    component: lazy(() => import('@widgets/admin').then(m => ({ default: m.SurveysWidget }))),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community', 'admin'],
  });

  registry.register({
    id: 'admin-announcements',
    version: '1.0.0',
    name: 'Admin Announcements',
    description: 'Manage community announcements',
    author: 'internal',
    category: 'core',
    icon: Megaphone,
    permissions: ['admin'],
    component: lazy(() =>
      import('@widgets/admin').then(m => ({
        default: m.AdminAnnouncementsWidget,
      }))
    ),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community', 'admin'],
  });

  registry.register({
    id: 'group-moderation',
    version: '1.0.0',
    name: 'Group Moderation',
    description: 'Pending group membership requests',
    author: 'internal',
    category: 'core',
    icon: User,
    permissions: ['admin'],
    component: lazy(() =>
      import('@widgets/admin').then(m => ({
        default: m.GroupModerationWidgetWithErrorBoundary,
      }))
    ),
    defaultSize: { width: 3, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community', 'admin'],
  });

  registry.register({
    id: 'page-settings',
    version: '1.0.0',
    name: 'Page Settings',
    description: 'Configure tenant page flags and visibility',
    author: 'internal',
    category: 'core',
    icon: Settings,
    permissions: ['admin'],
    component: lazy(() => import('@widgets/admin').then(m => ({ default: m.PageSettingsWidget }))),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'admin-competitions',
    version: '1.0.0',
    name: 'Competitions List',
    description: 'Full list of community competitions',
    author: 'internal',
    category: 'core',
    icon: Star,
    permissions: ['admin'],
    component: lazy(() => import('@widgets/admin').then(m => ({ default: m.CompetitionList }))),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community', 'admin'],
  });

  registry.register({
    id: 'admin-resources',
    version: '1.0.0',
    name: 'Resources List',
    description: 'Full list of community resources',
    author: 'internal',
    category: 'core',
    icon: FileText,
    permissions: ['admin'],
    component: lazy(() => import('@widgets/admin').then(m => ({ default: m.ResourceList }))),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community', 'admin'],
  });

  registry.register({
    id: 'admin-education',
    version: '1.0.0',
    name: 'Education Portal',
    description: 'Manage bursaries and learning resources',
    author: 'internal',
    category: 'core',
    icon: FileText,
    permissions: ['admin'],
    component: lazy(() => import('@widgets/admin').then(m => ({ default: m.EducationList }))),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'admin-merits',
    version: '1.0.0',
    name: 'Merits Escalation',
    description: 'Behavior record escalation status with infraction counts',
    author: 'internal',
    category: 'core',
    icon: Shield,
    permissions: ['admin'],
    component: lazy(() =>
      import('@/page-modules/admin/merits/ui/MeritEscalationWidget').then(m => ({
        default: m.MeritEscalationWidget,
      }))
    ),
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'admin-pending-disputes',
    version: '1.0.0',
    name: 'Pending Disputes',
    description: 'Behavior record disputes awaiting admin resolution',
    author: 'internal',
    category: 'core',
    icon: Shield,
    permissions: ['admin'],
    component: lazy(() =>
      import('@/page-modules/admin/merits/ui/PendingDisputesWidget').then(m => ({
        default: m.PendingDisputesWidget,
      }))
    ),
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'admin-dwallet',
    version: '1.0.0',
    name: 'dWallet Admin',
    description: 'Community value distribution, payout management, and compliance overview',
    author: 'internal',
    category: 'core',
    icon: Wallet,
    featureFlag: 'dWallet',
    permissions: ['admin', 'board'],
    component: lazy(() =>
      import('@entities/dwallet/ui/DWalletAdminWidget').then(m => ({
        default: m.DWalletAdminWidget,
      }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'community-gallery',
    version: '1.0.0',
    name: 'Community Gallery',
    description: 'Public albums shared by community members',
    author: 'internal',
    category: 'content',
    icon: Image,
    component: lazy(() =>
      import('../ui/CommunityGalleryWidget').then(m => ({ default: m.CommunityGalleryWidget }))
    ),
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community'],
  });

  registry.register({
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
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community'],
  });

  registry.register({
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
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community'],
  });

  registry.register({
    id: 'my-album',
    version: '1.0.0',
    name: 'My Album',
    description: "User's personal photo album",
    author: 'internal',
    category: 'content',
    icon: Grid,
    component: lazy(() => import('../ui/MyAlbumWidget').then(m => ({ default: m.MyAlbumWidget }))),
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community'],
  });

  registry.register({
    id: 'media',
    version: '1.0.0',
    name: 'Media Gallery',
    description: 'Community media gallery with photo and video uploads',
    author: 'internal',
    category: 'content',
    icon: Image,
    component: lazy(() => import('../ui/MediaWidget').then(m => ({ default: m.MediaWidget }))),
    defaultSize: { width: 2, height: 2 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community'],
  });

  registry.register({
    id: 'my-services',
    version: '1.0.0',
    name: 'My Services',
    description: 'Your community service listings, inquiries, and requests',
    author: 'internal',
    category: 'content',
    icon: Briefcase,
    featureFlag: 'services',
    component: lazy(() => import('@widgets/service').then(m => ({ default: m.MyServicesManager }))),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services', 'community'],
  });

  registry.register({
    id: 'service-marketplace',
    version: '1.0.0',
    name: 'Service Marketplace',
    description: 'Browse and book community service providers',
    author: 'internal',
    category: 'content',
    icon: Briefcase,
    featureFlag: 'services',
    component: lazy(() =>
      import('@features/marketplace').then(m => ({ default: m.MarketplaceWidget }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services'],
  });

  registry.register({
    id: 'service-inquiries',
    version: '1.0.0',
    name: 'Service Inquiries',
    description: 'Your received and sent service inquiries',
    author: 'internal',
    category: 'content',
    icon: Send,
    featureFlag: 'services',
    component: lazy(() => import('@widgets/service').then(m => ({ default: m.MyServicesManager }))),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services'],
  });

  // ═══════════════════════════════════════════════════════════════
  // UTILITY WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
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
    defaultSize: { width: 1, height: 3 },
    minSize: { width: 1, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home'],
  });

  // ═══════════════════════════════════════════════════════════════
  // PREMIUM WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
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
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community'],
  });

  registry.register({
    id: 'agent-dashboard',
    version: '1.0.0',
    name: 'Managed Properties',
    description: 'Properties you manage on behalf of owners',
    author: 'netcomplex-premium',
    category: 'premium',
    icon: Briefcase,
    premium: true,
    featureFlag: 'agents',
    permissions: ['agent', 'admin'],
    component: lazy(() =>
      import('../ui/AgentDashboardWidget').then(m => ({ default: m.AgentDashboardWidget }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services', 'admin'],
  });

  registry.register({
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
    defaultSize: { width: 4, height: 4 },
    minSize: { width: 3, height: 3 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['community'],
  });

  registry.register({
    id: 'agent-activity',
    version: '1.0.0',
    name: 'Agent Activity',
    description: "Track your agent's recent activities",
    author: 'netcomplex-premium',
    category: 'premium',
    icon: Activity,
    premium: true,
    featureFlag: 'agents',
    component: lazy(() =>
      import('../ui/AgentActivityWidget').then(m => ({ default: m.AgentActivityWidget }))
    ),
    defaultSize: { width: 3, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['services', 'admin'],
  });

  // ═══════════════════════════════════════════════════════════════
  // ACHIEVEMENTS WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
    id: 'achievements',
    version: '1.0.0',
    name: 'Achievements',
    description: 'Your achievement badges and progress',
    author: 'internal',
    category: 'content',
    icon: Trophy,
    component: lazy(() =>
      import('../ui/AchievementsWidget').then(m => ({ default: m.AchievementsWidget }))
    ),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home', 'community'],
  });

  registry.register({
    id: 'admin-achievements',
    version: '1.0.0',
    name: 'Achievement Catalog',
    description: 'Manage achievement definitions and thresholds',
    author: 'internal',
    category: 'core',
    icon: Trophy,
    permissions: ['admin'],
    component: lazy(() =>
      import('@widgets/admin').then(m => ({
        default: m.AdminAchievementsWidget,
      }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  // ═══════════════════════════════════════════════════════════════
  // AI PROVIDER WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
    id: 'admin-ai-usage',
    version: '1.0.0',
    name: 'AI Usage',
    description: 'Monthly AI token usage and feature breakdown',
    author: 'internal',
    category: 'core',
    icon: Sparkles,
    featureFlag: 'ai-provider',
    permissions: ['admin', 'board'],
    component: lazy(() =>
      import('@features/ai-provider').then(m => ({ default: m.AdminAiUsageWidget }))
    ),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
    // tenantId prop will be wired when dashboard shell context is available
  });

  // ═══════════════════════════════════════════════════════════════
  // BILLING WIDGETS (Phase 46.1)
  // ═══════════════════════════════════════════════════════════════

  registry.register({
    id: 'admin-billing-overview',
    version: '1.0.0',
    name: 'Billing Overview',
    description: 'MRR, tier distribution, and churn metrics',
    author: 'internal',
    category: 'core',
    icon: BarChart2,
    permissions: ['admin'],
    component: lazy(() =>
      import('../ui/AdminBillingOverviewWidget').then(m => ({
        default: m.AdminBillingOverviewWidget,
      }))
    ),
    defaultSize: { width: 4, height: 2 },
    minSize: { width: 2, height: 1 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'admin-subscriptions',
    version: '1.0.0',
    name: 'Subscriptions',
    description: 'Filterable, searchable subscription list',
    author: 'internal',
    category: 'core',
    icon: Users,
    permissions: ['admin'],
    component: lazy(() =>
      import('../ui/AdminSubscriptionsWidget').then(m => ({
        default: m.AdminSubscriptionsWidget,
      }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'admin-revenue',
    version: '1.0.0',
    name: 'Revenue',
    description: 'Monthly revenue chart and payment funnel',
    author: 'internal',
    category: 'core',
    icon: TrendingUp,
    permissions: ['admin'],
    component: lazy(() =>
      import('../ui/AdminRevenueWidget').then(m => ({
        default: m.AdminRevenueWidget,
      }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  // ═══════════════════════════════════════════════════════════════
  // DISPUTE RESOLUTION WIDGETS
  // ═══════════════════════════════════════════════════════════════

  registry.register({
    id: 'my-disputes',
    version: '1.0.0',
    name: 'My Disputes',
    description: 'Your filed disputes and their status',
    author: 'internal',
    category: 'core',
    icon: Scale,
    featureFlag: 'disputes',
    component: lazy(() =>
      import('../ui/MyDisputesWidget').then(m => ({ default: m.MyDisputesWidget }))
    ),
    defaultSize: { width: 3, height: 3 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home', 'community'],
  });

  registry.register({
    id: 'admin-disputes',
    version: '1.0.0',
    name: 'Dispute Moderation',
    description: 'Moderation queue for dispute resolution',
    author: 'internal',
    category: 'core',
    icon: Gavel,
    featureFlag: 'disputes',
    permissions: ['admin', 'board'],
    component: lazy(() =>
      import('../ui/AdminDisputesWidget').then(m => ({ default: m.AdminDisputesWidget }))
    ),
    defaultSize: { width: 4, height: 3 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  // ═══════════════════════════════════════════════════════════════
  // PROXY VOTE WIDGETS (Phase 125)
  // ═══════════════════════════════════════════════════════════════

  registry.register({
    id: 'hoa-proxy-votes',
    version: '1.0.0',
    name: 'Proxy Votes',
    description: 'Admin approval queue for proxy vote submissions',
    author: 'internal',
    category: 'core',
    icon: Scale,
    featureFlag: 'proxyVote',
    permissions: ['admin', 'board'],
    component: lazy(() =>
      import('@widgets/proxy-vote/ui/HoaProxyWidget').then(m => ({ default: m.HoaProxyWidget }))
    ),
    defaultSize: { width: 4, height: 4 },
    minSize: { width: 3, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['admin'],
  });

  registry.register({
    id: 'my-proxy-votes',
    version: '1.0.0',
    name: 'My Proxy Votes',
    description: 'Resident-facing list of active proxy appointments',
    author: 'internal',
    category: 'core',
    icon: UserCheck,
    featureFlag: 'proxyVote',
    permissions: ['resident', 'board'],
    component: lazy(() =>
      import('@widgets/proxy-vote/ui/ProxyWidget').then(m => ({ default: m.ProxyWidget }))
    ),
    defaultSize: { width: 3, height: 2 },
    minSize: { width: 2, height: 2 },
    dragHandleClassName: 'widget-drag-handle',
    spaces: ['home'],
  });
}
