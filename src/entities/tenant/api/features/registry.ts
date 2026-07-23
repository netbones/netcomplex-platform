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
  maxUsers: number;
  storageGB: number;
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
    tier: 'core',
    category: 'page',
    label: 'Community Directory',
    description: 'Resident directory with search and profiles',
    icon: 'users',
  },
  'page.dWallet': {
    key: 'page.dWallet',
    tier: 'foundation',
    category: 'page',
    label: 'Data Wallet',
    description: 'Per-resident data rights, consent, and revenue-share rewards wallet',
    icon: 'wallet',
  },
  'page.news': {
    key: 'page.news',
    tier: 'core',
    category: 'page',
    label: 'News & Announcements',
    description: 'Community news and announcements',
    icon: 'newspaper',
  },
  'page.events': {
    key: 'page.events',
    tier: 'core',
    category: 'page',
    label: 'Events',
    description: 'Community events calendar',
    icon: 'calendar',
  },
  'page.bookings': {
    key: 'page.bookings',
    tier: 'core',
    category: 'page',
    label: 'Facility Booking',
    description: 'Book community facilities',
    icon: 'calendar-check',
  },
  'page.conservation': {
    key: 'page.conservation',
    tier: 'core',
    category: 'page',
    label: 'Conservation Area',
    description: 'Nature conservation information (optional)',
    icon: 'leaf',
  },
  'page.bookshelf': {
    key: 'page.bookshelf',
    tier: 'core',
    category: 'page',
    label: 'Community Library',
    description: 'Borrow and share books',
    icon: 'book',
  },
  'page.groups': {
    key: 'page.groups',
    tier: 'core',
    category: 'page',
    label: 'Groups',
    description: 'Community groups and memberships',
    icon: 'users',
  },
  'page.marketplace': {
    key: 'page.marketplace',
    tier: 'foundation',
    category: 'page',
    label: 'Services Marketplace',
    description: 'Local service providers directory',
    icon: 'store',
  },
  'page.property': {
    key: 'page.property',
    tier: 'foundation',
    category: 'page',
    label: 'Property Listings',
    description: 'Buy/rent property listings',
    icon: 'home',
  },
  'page.maintenance': {
    key: 'page.maintenance',
    tier: 'core',
    category: 'page',
    label: 'Maintenance Requests',
    description: 'Submit and track maintenance requests',
    icon: 'wrench',
  },
  'page.surveys': {
    key: 'page.surveys',
    tier: 'core',
    category: 'page',
    label: 'Surveys',
    description: 'Community surveys and polls',
    icon: 'chart-bar',
  },
  'page.chat': {
    key: 'page.chat',
    tier: 'core',
    category: 'page',
    label: 'Community Chat',
    description: 'Real-time community messaging',
    icon: 'comments',
  },
  'page.analytics': {
    key: 'page.analytics',
    tier: 'pro-max',
    category: 'page',
    label: 'Analytics Dashboard',
    description: 'Advanced analytics and insights',
    icon: 'chart-line',
  },
  'page.disputes': {
    key: 'page.disputes',
    tier: 'foundation',
    category: 'page',
    label: 'Dispute Resolution',
    description: 'CSOS-compliant dispute filing and mediation',
    icon: 'balance-scale',
  },
  'page.education': {
    key: 'page.education',
    tier: 'core',
    category: 'page',
    label: 'Education Portal',
    description: 'Bursaries, scholarships, and free learning resources',
    icon: 'graduation-cap',
  },
  'page.agent-gateway': {
    key: 'page.agent-gateway',
    tier: 'pro-max',
    category: 'page',
    label: 'Agent Gateway',
    description: 'Manage property delegations, tokens, and agent access',
    icon: 'users',
  },
  'page.admin': {
    key: 'page.admin',
    tier: 'core',
    category: 'page',
    label: 'Admin Panel',
    description: 'Community administration',
    icon: 'cog',
  },
  'page.merits': {
    key: 'page.merits',
    tier: 'foundation',
    category: 'page',
    label: 'Community Merits',
    description: 'Community merits, standing tiers, and engagement scoring',
    icon: 'award',
  },

  // ----- FEATURES -----
  'feature.customBranding': {
    key: 'feature.customBranding',
    tier: 'foundation',
    category: 'feature',
    label: 'Custom Branding',
    description: 'Custom colors, logos, and CSS',
    icon: 'palette',
  },
  'feature.customDomain': {
    key: 'feature.customDomain',
    tier: 'foundation',
    category: 'feature',
    label: 'Custom Domain',
    description: 'Use your own domain',
    icon: 'globe',
  },
  'feature.apiAccess': {
    key: 'feature.apiAccess',
    tier: 'pro-max',
    category: 'feature',
    label: 'API Access',
    description: 'REST API access for integrations',
    icon: 'code',
  },
  'feature.premiumSupport': {
    key: 'feature.premiumSupport',
    tier: 'pro-max',
    category: 'feature',
    label: 'Premium Support',
    description: 'Priority support and SLA',
    icon: 'headset',
  },
  'feature.advancedGroups': {
    key: 'feature.advancedGroups',
    tier: 'foundation',
    category: 'feature',
    label: 'Advanced Groups',
    description: 'Premium group features and analytics',
    icon: 'users',
  },
  'feature.whiteLabel': {
    key: 'feature.whiteLabel',
    tier: 'pro-max',
    category: 'feature',
    label: 'White Label',
    description: 'Full white-label with no NetComplex branding',
    icon: 'tag',
  },
  'feature.bookingPayments': {
    key: 'feature.bookingPayments',
    tier: 'foundation',
    category: 'feature',
    label: 'Booking Payments',
    description: 'Accept payments for facility bookings',
    icon: 'credit-card',
  },
  'feature.facilityBooking': {
    key: 'feature.facilityBooking',
    tier: 'core',
    category: 'feature',
    label: 'Facility Booking Module',
    description: 'Calendar view and advanced facility booking',
    icon: 'calendar-check',
  },
  'feature.conservation': {
    key: 'feature.conservation',
    tier: 'core',
    category: 'feature',
    label: 'Conservation Module',
    description: 'Enable conservation area features',
    icon: 'leaf',
  },
  'feature.agentDashboard': {
    key: 'feature.agentDashboard',
    tier: 'foundation',
    category: 'feature',
    label: 'Agent Dashboard',
    description: 'Real estate agent management',
    icon: 'briefcase',
  },
  'feature.externalSurveys': {
    key: 'feature.externalSurveys',
    tier: 'foundation',
    category: 'feature',
    label: 'External Surveys',
    description: 'Integrate external survey tools',
    icon: 'external-link',
  },
  'feature.education.bursaries': {
    key: 'feature.education.bursaries',
    tier: 'core',
    category: 'feature',
    label: 'Bursaries',
    description: 'Manage and display bursary listings',
    icon: 'money-bill-wave',
  },
  'feature.education.resources': {
    key: 'feature.education.resources',
    tier: 'core',
    category: 'feature',
    label: 'Education Resources',
    description: 'Curated learning resources and Gutenberg shelf',
    icon: 'book-open',
  },
  'feature.communityMerits': {
    key: 'feature.communityMerits',
    tier: 'foundation',
    category: 'feature',
    label: 'Community Merits',
    description: 'Standing tiers, merit scoring, and engagement tracking',
    icon: 'award',
  },
  'feature.enable-setup-center': {
    key: 'feature.enable-setup-center',
    tier: 'foundation',
    category: 'feature',
    label: 'Setup Center',
    description:
      'Replace the 7-step onboarding wizard with the persistent mission-based Setup Center',
    icon: 'clipboard-check',
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
    tier: 'core',
    category: 'community',
    label: 'Resident Directory',
    description: 'Searchable resident list',
    page: 'directory',
  },
  'events-widget': {
    key: 'events-widget',
    tier: 'core',
    category: 'community',
    label: 'Upcoming Events',
    description: 'Event calendar widget',
    page: 'events',
  },
  'bookings-widget': {
    key: 'bookings-widget',
    tier: 'core',
    category: 'community',
    label: 'Facility Booking',
    description: 'Book community facilities',
    page: 'bookings',
  },
  'groups-widget': {
    key: 'groups-widget',
    tier: 'core',
    category: 'community',
    label: 'Community Groups',
    description: 'Group membership widget',
    page: 'groups',
  },
  'chat-widget': {
    key: 'chat-widget',
    tier: 'core',
    category: 'community',
    label: 'Community Chat',
    description: 'Real-time messaging',
    page: 'chat',
  },
  'conservation-widget': {
    key: 'conservation-widget',
    tier: 'core',
    category: 'community',
    label: 'Conservation Info',
    description: 'Conservation area information',
    page: 'conservation',
  },
  'bookshelf-widget': {
    key: 'bookshelf-widget',
    tier: 'core',
    category: 'community',
    label: 'Community Library',
    description: 'Book sharing widget',
    page: 'bookshelf',
  },
  'news-widget': {
    key: 'news-widget',
    tier: 'core',
    category: 'community',
    label: 'News Feed',
    description: 'Announcements and news',
    page: 'news',
  },
  'dwallet-summary': {
    key: 'dwallet-summary',
    tier: 'foundation',
    category: 'community',
    label: 'My dWallet',
    description: 'Community value, consent status, and impact at a glance',
    page: 'dWallet',
  },
  'maintenance-widget': {
    key: 'maintenance-widget',
    tier: 'core',
    category: 'community',
    label: 'Maintenance Requests',
    description: 'Submit and track requests',
    page: 'maintenance',
  },
  'surveys-widget': {
    key: 'surveys-widget',
    tier: 'core',
    category: 'community',
    label: 'Surveys',
    description: 'Community polls',
    page: 'surveys',
  },

  // Marketplace Widgets
  'services-widget': {
    key: 'services-widget',
    tier: 'foundation',
    category: 'marketplace',
    label: 'Services Directory',
    description: 'Service provider listings',
    page: 'marketplace',
  },
  'property-widget': {
    key: 'property-widget',
    tier: 'foundation',
    category: 'marketplace',
    label: 'Property Listings',
    description: 'Buy/rent property listings',
    page: 'property',
  },
  'agent-widget': {
    key: 'agent-widget',
    tier: 'foundation',
    category: 'marketplace',
    label: 'Agent Dashboard',
    description: 'Agent management widget',
    page: 'property',
  },

  // Admin Widgets
  'analytics-widget': {
    key: 'analytics-widget',
    tier: 'pro-max',
    category: 'admin',
    label: 'Analytics',
    description: 'Advanced analytics',
    page: 'analytics',
  },
  'dwallet-admin': {
    key: 'dwallet-admin',
    tier: 'foundation',
    category: 'admin',
    label: 'dWallet Admin',
    description: 'Community value distribution, payout management, and compliance overview',
    page: 'admin',
  },
  'education-admin': {
    key: 'education-admin',
    tier: 'core',
    category: 'admin',
    label: 'Education Portal Admin',
    description: 'Manage bursaries, resources, and education settings',
    page: 'admin',
  },
  'stats-widget': {
    key: 'stats-widget',
    tier: 'core',
    category: 'admin',
    label: 'Dashboard Stats',
    description: 'Overview statistics',
    page: 'admin',
  },
  'notifications-widget': {
    key: 'notifications-widget',
    tier: 'core',
    category: 'admin',
    label: 'Notifications',
    description: 'Notification management',
    page: 'admin',
  },
  'households-widget': {
    key: 'households-widget',
    tier: 'core',
    category: 'admin',
    label: 'Households',
    description: 'Property management',
    page: 'admin',
  },

  // Utility Widgets
  'quick-actions-widget': {
    key: 'quick-actions-widget',
    tier: 'core',
    category: 'utility',
    label: 'Quick Actions',
    description: 'Common action shortcuts',
    page: 'dashboard',
  },
  'recent-activity-widget': {
    key: 'recent-activity-widget',
    tier: 'core',
    category: 'utility',
    label: 'Recent Activity',
    description: 'Activity feed',
    page: 'dashboard',
  },
  'my-album-widget': {
    key: 'my-album-widget',
    tier: 'core',
    category: 'utility',
    label: 'My Albums',
    description: 'Photo album widget',
    page: 'media',
  },
  'media-widget': {
    key: 'media-widget',
    tier: 'core',
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
  if (tier === 'foundation') return 'foundation';
  if (tier === 'pro-max') return 'pro-max';
  return 'core';
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
  const tierOrder: TierLevel[] = ['core', 'foundation', 'pro-max'];
  return tierOrder.indexOf(tenantTier) >= tierOrder.indexOf(feature.tier);
}

export function getFeaturesForTier(tier: TierLevel): FeatureDefinition[] {
  const tierOrder: TierLevel[] = ['core', 'foundation', 'pro-max'];
  const tierIndex = tierOrder.indexOf(tier);

  return Object.values(FEATURE_REGISTRY).filter(f => tierOrder.indexOf(f.tier) <= tierIndex);
}

export function getPagesForTier(tier: TierLevel): FeatureDefinition[] {
  return getFeaturesForTier(tier).filter(f => f.category === 'page');
}

export function getWidgetsForTier(tier: TierLevel): WidgetDefinition[] {
  const tierOrder: TierLevel[] = ['core', 'foundation', 'pro-max'];
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

  const tierOrder: TierLevel[] = ['core', 'foundation', 'pro-max'];
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
