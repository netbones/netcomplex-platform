/**
 * NetComplex Feature Registry
 *
 * Nature-themed subscription tiers:
 * - Sprout: Entry tier (5 pages max)
 * - Grove: Growth tier (15 pages max)
 * - Forest: Enterprise tier (unlimited pages)
 */

export type TierLevel = 'sprout' | 'grove' | 'forest';

export interface FeatureDefinition {
  key: string;
  tier: TierLevel;
  category: 'page' | 'feature' | 'widget';
  label: string;
  description: string;
  icon?: string;
}

export interface TierDefinition {
  id: TierLevel;
  name: string;
  maxPages: number;
  description: string;
  color: string;
  features: string[];
}

// ============================================
// TIER DEFINITIONS
// ============================================

export const TIERS: Record<TierLevel, TierDefinition> = {
  sprout: {
    id: 'sprout',
    name: 'Sprout',
    maxPages: 5,
    description: 'Entry tier for small communities',
    color: '#22C55E', // green-500
    features: [],
  },
  grove: {
    id: 'grove',
    name: 'Grove',
    maxPages: 15,
    description: 'Growth tier for expanding communities',
    color: '#F59E0B', // amber-500
    features: [],
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    maxPages: -1, // unlimited
    description: 'Enterprise tier for full-featured communities',
    color: '#1E293B', // slate-800
    features: [],
  },
};

// ============================================
// FEATURE REGISTRY
// ============================================

export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  // ----- PAGES -----
  'page.directory': {
    key: 'page.directory',
    tier: 'sprout',
    category: 'page',
    label: 'Community Directory',
    description: 'Resident directory with search and profiles',
    icon: 'users',
  },
  'page.news': {
    key: 'page.news',
    tier: 'sprout',
    category: 'page',
    label: 'News & Announcements',
    description: 'Community news and announcements',
    icon: 'newspaper',
  },
  'page.events': {
    key: 'page.events',
    tier: 'sprout',
    category: 'page',
    label: 'Events',
    description: 'Community events calendar',
    icon: 'calendar',
  },
  'page.bookings': {
    key: 'page.bookings',
    tier: 'sprout',
    category: 'page',
    label: 'Facility Booking',
    description: 'Book community facilities',
    icon: 'calendar-check',
  },
  'page.conservation': {
    key: 'page.conservation',
    tier: 'sprout',
    category: 'page',
    label: 'Conservation Area',
    description: 'Nature conservation information (optional)',
    icon: 'leaf',
  },
  'page.bookshelf': {
    key: 'page.bookshelf',
    tier: 'sprout',
    category: 'page',
    label: 'Community Library',
    description: 'Borrow and share books',
    icon: 'book',
  },
  'page.groups': {
    key: 'page.groups',
    tier: 'sprout',
    category: 'page',
    label: 'Groups',
    description: 'Community groups and memberships',
    icon: 'users',
  },
  'page.marketplace': {
    key: 'page.marketplace',
    tier: 'grove',
    category: 'page',
    label: 'Services Marketplace',
    description: 'Local service providers directory',
    icon: 'store',
  },
  'page.property': {
    key: 'page.property',
    tier: 'grove',
    category: 'page',
    label: 'Property Listings',
    description: 'Buy/rent property listings',
    icon: 'home',
  },
  'page.maintenance': {
    key: 'page.maintenance',
    tier: 'sprout',
    category: 'page',
    label: 'Maintenance Requests',
    description: 'Submit and track maintenance requests',
    icon: 'wrench',
  },
  'page.surveys': {
    key: 'page.surveys',
    tier: 'sprout',
    category: 'page',
    label: 'Surveys',
    description: 'Community surveys and polls',
    icon: 'chart-bar',
  },
  'page.chat': {
    key: 'page.chat',
    tier: 'sprout',
    category: 'page',
    label: 'Community Chat',
    description: 'Real-time community messaging',
    icon: 'comments',
  },
  'page.analytics': {
    key: 'page.analytics',
    tier: 'forest',
    category: 'page',
    label: 'Analytics Dashboard',
    description: 'Advanced analytics and insights',
    icon: 'chart-line',
  },
  'page.admin': {
    key: 'page.admin',
    tier: 'sprout',
    category: 'page',
    label: 'Admin Panel',
    description: 'Community administration',
    icon: 'cog',
  },

  // ----- FEATURES -----
  'feature.customBranding': {
    key: 'feature.customBranding',
    tier: 'grove',
    category: 'feature',
    label: 'Custom Branding',
    description: 'Custom colors, logos, and CSS',
    icon: 'palette',
  },
  'feature.customDomain': {
    key: 'feature.customDomain',
    tier: 'grove',
    category: 'feature',
    label: 'Custom Domain',
    description: 'Use your own domain',
    icon: 'globe',
  },
  'feature.apiAccess': {
    key: 'feature.apiAccess',
    tier: 'forest',
    category: 'feature',
    label: 'API Access',
    description: 'REST API access for integrations',
    icon: 'code',
  },
  'feature.premiumSupport': {
    key: 'feature.premiumSupport',
    tier: 'forest',
    category: 'feature',
    label: 'Premium Support',
    description: 'Priority support and SLA',
    icon: 'headset',
  },
  'feature.advancedGroups': {
    key: 'feature.advancedGroups',
    tier: 'grove',
    category: 'feature',
    label: 'Advanced Groups',
    description: 'Premium group features and analytics',
    icon: 'users',
  },
  'feature.whiteLabel': {
    key: 'feature.whiteLabel',
    tier: 'forest',
    category: 'feature',
    label: 'White Label',
    description: 'Full white-label with no NetComplex branding',
    icon: 'tag',
  },
  'feature.bookingPayments': {
    key: 'feature.bookingPayments',
    tier: 'grove',
    category: 'feature',
    label: 'Booking Payments',
    description: 'Accept payments for facility bookings',
    icon: 'credit-card',
  },
  'feature.conservation': {
    key: 'feature.conservation',
    tier: 'sprout',
    category: 'feature',
    label: 'Conservation Module',
    description: 'Enable conservation area features',
    icon: 'leaf',
  },
  'feature.agentDashboard': {
    key: 'feature.agentDashboard',
    tier: 'grove',
    category: 'feature',
    label: 'Agent Dashboard',
    description: 'Real estate agent management',
    icon: 'briefcase',
  },
  'feature.externalSurveys': {
    key: 'feature.externalSurveys',
    tier: 'grove',
    category: 'feature',
    label: 'External Surveys',
    description: 'Integrate external survey tools',
    icon: 'external-link',
  },
};

// ============================================
// WIDGET REGISTRY
// ============================================

export interface WidgetDefinition {
  key: string;
  tier: TierLevel;
  category: 'community' | 'admin' | 'marketplace' | 'utility';
  label: string;
  description: string;
  page?: string;
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // Community Widgets
  'directory-widget': {
    key: 'directory-widget',
    tier: 'sprout',
    category: 'community',
    label: 'Resident Directory',
    description: 'Searchable resident list',
    page: 'directory',
  },
  'events-widget': {
    key: 'events-widget',
    tier: 'sprout',
    category: 'community',
    label: 'Upcoming Events',
    description: 'Event calendar widget',
    page: 'events',
  },
  'bookings-widget': {
    key: 'bookings-widget',
    tier: 'sprout',
    category: 'community',
    label: 'Facility Booking',
    description: 'Book community facilities',
    page: 'bookings',
  },
  'groups-widget': {
    key: 'groups-widget',
    tier: 'sprout',
    category: 'community',
    label: 'Community Groups',
    description: 'Group membership widget',
    page: 'groups',
  },
  'chat-widget': {
    key: 'chat-widget',
    tier: 'sprout',
    category: 'community',
    label: 'Community Chat',
    description: 'Real-time messaging',
    page: 'chat',
  },
  'conservation-widget': {
    key: 'conservation-widget',
    tier: 'sprout',
    category: 'community',
    label: 'Conservation Info',
    description: 'Conservation area information',
    page: 'conservation',
  },
  'bookshelf-widget': {
    key: 'bookshelf-widget',
    tier: 'sprout',
    category: 'community',
    label: 'Community Library',
    description: 'Book sharing widget',
    page: 'bookshelf',
  },
  'news-widget': {
    key: 'news-widget',
    tier: 'sprout',
    category: 'community',
    label: 'News Feed',
    description: 'Announcements and news',
    page: 'news',
  },
  'maintenance-widget': {
    key: 'maintenance-widget',
    tier: 'sprout',
    category: 'community',
    label: 'Maintenance Requests',
    description: 'Submit and track requests',
    page: 'maintenance',
  },
  'surveys-widget': {
    key: 'surveys-widget',
    tier: 'sprout',
    category: 'community',
    label: 'Surveys',
    description: 'Community polls',
    page: 'surveys',
  },

  // Marketplace Widgets
  'services-widget': {
    key: 'services-widget',
    tier: 'grove',
    category: 'marketplace',
    label: 'Services Directory',
    description: 'Service provider listings',
    page: 'marketplace',
  },
  'property-widget': {
    key: 'property-widget',
    tier: 'grove',
    category: 'marketplace',
    label: 'Property Listings',
    description: 'Buy/rent property listings',
    page: 'property',
  },
  'agent-widget': {
    key: 'agent-widget',
    tier: 'grove',
    category: 'marketplace',
    label: 'Agent Dashboard',
    description: 'Agent management widget',
    page: 'property',
  },

  // Admin Widgets
  'analytics-widget': {
    key: 'analytics-widget',
    tier: 'forest',
    category: 'admin',
    label: 'Analytics',
    description: 'Advanced analytics',
    page: 'analytics',
  },
  'stats-widget': {
    key: 'stats-widget',
    tier: 'sprout',
    category: 'admin',
    label: 'Dashboard Stats',
    description: 'Overview statistics',
    page: 'admin',
  },
  'notifications-widget': {
    key: 'notifications-widget',
    tier: 'sprout',
    category: 'admin',
    label: 'Notifications',
    description: 'Notification management',
    page: 'admin',
  },
  'households-widget': {
    key: 'households-widget',
    tier: 'sprout',
    category: 'admin',
    label: 'Households',
    description: 'Property management',
    page: 'admin',
  },

  // Utility Widgets
  'quick-actions-widget': {
    key: 'quick-actions-widget',
    tier: 'sprout',
    category: 'utility',
    label: 'Quick Actions',
    description: 'Common action shortcuts',
    page: 'dashboard',
  },
  'recent-activity-widget': {
    key: 'recent-activity-widget',
    tier: 'sprout',
    category: 'utility',
    label: 'Recent Activity',
    description: 'Activity feed',
    page: 'dashboard',
  },
  'my-album-widget': {
    key: 'my-album-widget',
    tier: 'sprout',
    category: 'utility',
    label: 'My Albums',
    description: 'Photo album widget',
    page: 'media',
  },
  'media-widget': {
    key: 'media-widget',
    tier: 'sprout',
    category: 'utility',
    label: 'Media Gallery',
    description: 'Shared media gallery',
    page: 'media',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getTierLevel(tier: string): TierLevel {
  if (tier === 'grove') return 'grove';
  if (tier === 'forest') return 'forest';
  return 'sprout';
}

export function hasFeature(
  featureKey: string,
  tenantTier: TierLevel,
  featureFlags?: Record<string, boolean>
): boolean {
  const feature = FEATURE_REGISTRY[featureKey];
  if (!feature) return false;

  // Check if explicitly disabled in feature flags
  if (featureFlags && featureKey in featureFlags) {
    return featureFlags[featureKey];
  }

  // Otherwise check tier
  const tierOrder: TierLevel[] = ['sprout', 'grove', 'forest'];
  return tierOrder.indexOf(tenantTier) >= tierOrder.indexOf(feature.tier);
}

export function getFeaturesForTier(tier: TierLevel): FeatureDefinition[] {
  const tierOrder: TierLevel[] = ['sprout', 'grove', 'forest'];
  const tierIndex = tierOrder.indexOf(tier);

  return Object.values(FEATURE_REGISTRY).filter(f => tierOrder.indexOf(f.tier) <= tierIndex);
}

export function getPagesForTier(tier: TierLevel): FeatureDefinition[] {
  return getFeaturesForTier(tier).filter(f => f.category === 'page');
}

export function getWidgetsForTier(tier: TierLevel): WidgetDefinition[] {
  const tierOrder: TierLevel[] = ['sprout', 'grove', 'forest'];
  const tierIndex = tierOrder.indexOf(tier);

  return Object.values(WIDGET_REGISTRY).filter(w => tierOrder.indexOf(w.tier) <= tierIndex);
}

export function canAccessPage(
  pageKey: string,
  tenantTier: TierLevel,
  featureFlags?: Record<string, boolean>
): boolean {
  return hasFeature(`page.${pageKey}`, tenantTier, featureFlags);
}

export function canUseWidget(widgetKey: string, tenantTier: TierLevel): boolean {
  const widget = WIDGET_REGISTRY[widgetKey];
  if (!widget) return true; // Allow unknown widgets

  const tierOrder: TierLevel[] = ['sprout', 'grove', 'forest'];
  return tierOrder.indexOf(tenantTier) >= tierOrder.indexOf(widget.tier);
}

// Add helpers
export function getEnabledFeaturesForTenant(
  tenant: Tenant,
  featureFlags?: Record<string, boolean>
): FeatureDefinition[] {
  return Object.values(FEATURE_REGISTRY).filter(f =>
    hasFeature(f.key, tenant.subscriptionTier, tenant.featureFlags ?? featureFlags)
  );
}

export function isFeatureEnabled(tenant: Tenant, key: string): boolean {
  return hasFeature(key, tenant.subscriptionTier, tenant.featureFlags);
}
