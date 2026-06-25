/**
 * NetComplex Feature Registry
 *
 * Module-based tier system - see docs/TIER_MODEL.md for full documentation.
 * Tier and module constants are now defined in src/lib/constants/tiers.ts
 */

import {
  TIERS,
  MODULES,
  type TierLevel,
  type ModuleKey,
  hasModuleAccess,
  getTierModules,
} from '@shared/lib';
import type { Tenant } from '@shared/lib';

export type { TierLevel, ModuleKey };
export { TIERS, MODULES, hasModuleAccess, getTierModules };

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
// FEATURE REGISTRY
// ============================================

export const FEATURE_REGISTRY: Record<string, FeatureDefinition> = {
  // ----- PAGES -----
  'page.directory': {
    key: 'page.directory',
    tier: 'foundation',
    category: 'page',
    label: 'Community Directory',
    description: 'Resident directory with search and profiles',
    icon: 'users',
  },
  'page.dWallet': {
    key: 'page.dWallet',
    tier: 'depth',
    category: 'page',
    label: 'Data Wallet',
    description: 'Per-resident data rights, consent, and revenue-share rewards wallet',
    icon: 'wallet',
  },
  'page.news': {
    key: 'page.news',
    tier: 'foundation',
    category: 'page',
    label: 'News & Announcements',
    description: 'Community news and announcements',
    icon: 'newspaper',
  },
  'page.events': {
    key: 'page.events',
    tier: 'foundation',
    category: 'page',
    label: 'Events',
    description: 'Community events calendar',
    icon: 'calendar',
  },
  'page.bookings': {
    key: 'page.bookings',
    tier: 'foundation',
    category: 'page',
    label: 'Facility Booking',
    description: 'Book community facilities',
    icon: 'calendar-check',
  },
  'page.conservation': {
    key: 'page.conservation',
    tier: 'foundation',
    category: 'page',
    label: 'Conservation Area',
    description: 'Nature conservation information (optional)',
    icon: 'leaf',
  },
  'page.bookshelf': {
    key: 'page.bookshelf',
    tier: 'foundation',
    category: 'page',
    label: 'Community Library',
    description: 'Borrow and share books',
    icon: 'book',
  },
  'page.groups': {
    key: 'page.groups',
    tier: 'foundation',
    category: 'page',
    label: 'Groups',
    description: 'Community groups and memberships',
    icon: 'users',
  },
  'page.marketplace': {
    key: 'page.marketplace',
    tier: 'depth',
    category: 'page',
    label: 'Services Marketplace',
    description: 'Local service providers directory',
    icon: 'store',
  },
  'page.property': {
    key: 'page.property',
    tier: 'depth',
    category: 'page',
    label: 'Property Listings',
    description: 'Buy/rent property listings',
    icon: 'home',
  },
  'page.maintenance': {
    key: 'page.maintenance',
    tier: 'foundation',
    category: 'page',
    label: 'Maintenance Requests',
    description: 'Submit and track maintenance requests',
    icon: 'wrench',
  },
  'page.surveys': {
    key: 'page.surveys',
    tier: 'foundation',
    category: 'page',
    label: 'Surveys',
    description: 'Community surveys and polls',
    icon: 'chart-bar',
  },
  'page.chat': {
    key: 'page.chat',
    tier: 'foundation',
    category: 'page',
    label: 'Community Chat',
    description: 'Real-time community messaging',
    icon: 'comments',
  },
  'page.analytics': {
    key: 'page.analytics',
    tier: 'core',
    category: 'page',
    label: 'Analytics Dashboard',
    description: 'Advanced analytics and insights',
    icon: 'chart-line',
  },
  'page.admin': {
    key: 'page.admin',
    tier: 'foundation',
    category: 'page',
    label: 'Admin Panel',
    description: 'Community administration',
    icon: 'cog',
  },

  // ----- FEATURES -----
  'feature.customBranding': {
    key: 'feature.customBranding',
    tier: 'depth',
    category: 'feature',
    label: 'Custom Branding',
    description: 'Custom colors, logos, and CSS',
    icon: 'palette',
  },
  'feature.customDomain': {
    key: 'feature.customDomain',
    tier: 'depth',
    category: 'feature',
    label: 'Custom Domain',
    description: 'Use your own domain',
    icon: 'globe',
  },
  'feature.apiAccess': {
    key: 'feature.apiAccess',
    tier: 'core',
    category: 'feature',
    label: 'API Access',
    description: 'REST API access for integrations',
    icon: 'code',
  },
  'feature.premiumSupport': {
    key: 'feature.premiumSupport',
    tier: 'core',
    category: 'feature',
    label: 'Premium Support',
    description: 'Priority support and SLA',
    icon: 'headset',
  },
  'feature.advancedGroups': {
    key: 'feature.advancedGroups',
    tier: 'depth',
    category: 'feature',
    label: 'Advanced Groups',
    description: 'Premium group features and analytics',
    icon: 'users',
  },
  'feature.whiteLabel': {
    key: 'feature.whiteLabel',
    tier: 'core',
    category: 'feature',
    label: 'White Label',
    description: 'Full white-label with no NetComplex branding',
    icon: 'tag',
  },
  'feature.bookingPayments': {
    key: 'feature.bookingPayments',
    tier: 'depth',
    category: 'feature',
    label: 'Booking Payments',
    description: 'Accept payments for facility bookings',
    icon: 'credit-card',
  },
  'feature.facilityBooking': {
    key: 'feature.facilityBooking',
    tier: 'foundation',
    category: 'feature',
    label: 'Facility Booking Module',
    description: 'Calendar view and advanced facility booking',
    icon: 'calendar-check',
  },
  'feature.conservation': {
    key: 'feature.conservation',
    tier: 'foundation',
    category: 'feature',
    label: 'Conservation Module',
    description: 'Enable conservation area features',
    icon: 'leaf',
  },
  'feature.agentDashboard': {
    key: 'feature.agentDashboard',
    tier: 'depth',
    category: 'feature',
    label: 'Agent Dashboard',
    description: 'Real estate agent management',
    icon: 'briefcase',
  },
  'feature.externalSurveys': {
    key: 'feature.externalSurveys',
    tier: 'depth',
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
    tier: 'foundation',
    category: 'community',
    label: 'Resident Directory',
    description: 'Searchable resident list',
    page: 'directory',
  },
  'events-widget': {
    key: 'events-widget',
    tier: 'foundation',
    category: 'community',
    label: 'Upcoming Events',
    description: 'Event calendar widget',
    page: 'events',
  },
  'bookings-widget': {
    key: 'bookings-widget',
    tier: 'foundation',
    category: 'community',
    label: 'Facility Booking',
    description: 'Book community facilities',
    page: 'bookings',
  },
  'groups-widget': {
    key: 'groups-widget',
    tier: 'foundation',
    category: 'community',
    label: 'Community Groups',
    description: 'Group membership widget',
    page: 'groups',
  },
  'chat-widget': {
    key: 'chat-widget',
    tier: 'foundation',
    category: 'community',
    label: 'Community Chat',
    description: 'Real-time messaging',
    page: 'chat',
  },
  'conservation-widget': {
    key: 'conservation-widget',
    tier: 'foundation',
    category: 'community',
    label: 'Conservation Info',
    description: 'Conservation area information',
    page: 'conservation',
  },
  'bookshelf-widget': {
    key: 'bookshelf-widget',
    tier: 'foundation',
    category: 'community',
    label: 'Community Library',
    description: 'Book sharing widget',
    page: 'bookshelf',
  },
  'news-widget': {
    key: 'news-widget',
    tier: 'foundation',
    category: 'community',
    label: 'News Feed',
    description: 'Announcements and news',
    page: 'news',
  },
  'dwallet-summary': {
    key: 'dwallet-summary',
    tier: 'depth',
    category: 'community',
    label: 'My dWallet',
    description: 'Community value, consent status, and impact at a glance',
    page: 'dWallet',
  },
  'maintenance-widget': {
    key: 'maintenance-widget',
    tier: 'foundation',
    category: 'community',
    label: 'Maintenance Requests',
    description: 'Submit and track requests',
    page: 'maintenance',
  },
  'surveys-widget': {
    key: 'surveys-widget',
    tier: 'foundation',
    category: 'community',
    label: 'Surveys',
    description: 'Community polls',
    page: 'surveys',
  },

  // Marketplace Widgets
  'services-widget': {
    key: 'services-widget',
    tier: 'depth',
    category: 'marketplace',
    label: 'Services Directory',
    description: 'Service provider listings',
    page: 'marketplace',
  },
  'property-widget': {
    key: 'property-widget',
    tier: 'depth',
    category: 'marketplace',
    label: 'Property Listings',
    description: 'Buy/rent property listings',
    page: 'property',
  },
  'agent-widget': {
    key: 'agent-widget',
    tier: 'depth',
    category: 'marketplace',
    label: 'Agent Dashboard',
    description: 'Agent management widget',
    page: 'property',
  },

  // Admin Widgets
  'analytics-widget': {
    key: 'analytics-widget',
    tier: 'core',
    category: 'admin',
    label: 'Analytics',
    description: 'Advanced analytics',
    page: 'analytics',
  },
  'dwallet-admin': {
    key: 'dwallet-admin',
    tier: 'depth',
    category: 'admin',
    label: 'dWallet Admin',
    description: 'Community value distribution, payout management, and compliance overview',
    page: 'admin',
  },
  'stats-widget': {
    key: 'stats-widget',
    tier: 'foundation',
    category: 'admin',
    label: 'Dashboard Stats',
    description: 'Overview statistics',
    page: 'admin',
  },
  'notifications-widget': {
    key: 'notifications-widget',
    tier: 'foundation',
    category: 'admin',
    label: 'Notifications',
    description: 'Notification management',
    page: 'admin',
  },
  'households-widget': {
    key: 'households-widget',
    tier: 'foundation',
    category: 'admin',
    label: 'Households',
    description: 'Property management',
    page: 'admin',
  },

  // Utility Widgets
  'quick-actions-widget': {
    key: 'quick-actions-widget',
    tier: 'foundation',
    category: 'utility',
    label: 'Quick Actions',
    description: 'Common action shortcuts',
    page: 'dashboard',
  },
  'recent-activity-widget': {
    key: 'recent-activity-widget',
    tier: 'foundation',
    category: 'utility',
    label: 'Recent Activity',
    description: 'Activity feed',
    page: 'dashboard',
  },
  'my-album-widget': {
    key: 'my-album-widget',
    tier: 'foundation',
    category: 'utility',
    label: 'My Albums',
    description: 'Photo album widget',
    page: 'media',
  },
  'media-widget': {
    key: 'media-widget',
    tier: 'foundation',
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
  if (tier === 'depth') return 'depth';
  if (tier === 'core') return 'core';
  return 'foundation';
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
  const tierOrder: TierLevel[] = ['foundation', 'depth', 'core'];
  return tierOrder.indexOf(tenantTier) >= tierOrder.indexOf(feature.tier);
}

export function getFeaturesForTier(tier: TierLevel): FeatureDefinition[] {
  const tierOrder: TierLevel[] = ['foundation', 'depth', 'core'];
  const tierIndex = tierOrder.indexOf(tier);

  return Object.values(FEATURE_REGISTRY).filter(f => tierOrder.indexOf(f.tier) <= tierIndex);
}

export function getPagesForTier(tier: TierLevel): FeatureDefinition[] {
  return getFeaturesForTier(tier).filter(f => f.category === 'page');
}

export function getWidgetsForTier(tier: TierLevel): WidgetDefinition[] {
  const tierOrder: TierLevel[] = ['foundation', 'depth', 'core'];
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

  const tierOrder: TierLevel[] = ['foundation', 'depth', 'core'];
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
