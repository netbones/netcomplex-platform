/**
 * NetComplex Tier and Module Constants
 *
 * Defines the module-based tier system for multi-tenant access control.
 * See docs/TIER_MODEL.md for full documentation.
 */

export type TierLevel = 'foundation' | 'depth' | 'core';

export type ModuleKey =
  | 'directory'
  | 'news'
  | 'events'
  | 'groups'
  | 'chat'
  | 'resources'
  | 'conservation'
  | 'adminBasic'
  | 'adminIntermediate'
  | 'bookings'
  | 'surveys'
  | 'marketplace'
  | 'externalSurveys'
  | 'maintenance'
  | 'property'
  | 'agentGateway'
  | 'analytics'
  | 'education'
  | 'adminAdvanced';

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  tier: TierLevel;
}

export interface TierDefinition {
  id: TierLevel;
  name: string;
  maxPages: number;
  description: string;
  color: string;
  modules: ModuleKey[];
}

// ============================================
// MODULE DEFINITIONS
// ============================================

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  // Foundation Modules
  directory: {
    key: 'directory',
    label: 'Directory',
    description: 'Resident directory with search and profiles',
    tier: 'foundation',
  },
  news: {
    key: 'news',
    label: 'News',
    description: 'Community news and announcements',
    tier: 'foundation',
  },
  events: {
    key: 'events',
    label: 'Events',
    description: 'Community events calendar',
    tier: 'foundation',
  },
  groups: {
    key: 'groups',
    label: 'Groups',
    description: 'Interest groups and memberships',
    tier: 'foundation',
  },
  chat: {
    key: 'chat',
    label: 'Chat',
    description: 'Real-time community messaging',
    tier: 'foundation',
  },
  resources: {
    key: 'resources',
    label: 'Resources',
    description: 'Community library/bookshelf',
    tier: 'foundation',
  },
  conservation: {
    key: 'conservation',
    label: 'Conservation',
    description: 'Conservation area features',
    tier: 'foundation',
  },
  adminBasic: {
    key: 'adminBasic',
    label: 'Admin (Basic)',
    description: 'Basic community administration',
    tier: 'foundation',
  },

  // Depth Modules
  adminIntermediate: {
    key: 'adminIntermediate',
    label: 'Admin (Intermediate)',
    description: 'Expanded admin for growing communities',
    tier: 'depth',
  },
  bookings: {
    key: 'bookings',
    label: 'Bookings',
    description: 'Facility booking system',
    tier: 'depth',
  },
  surveys: {
    key: 'surveys',
    label: 'Surveys',
    description: 'Community polls and surveys',
    tier: 'depth',
  },
  marketplace: {
    key: 'marketplace',
    label: 'Marketplace',
    description: 'Services directory',
    tier: 'depth',
  },
  externalSurveys: {
    key: 'externalSurveys',
    label: 'External Surveys',
    description: 'Third-party survey integration',
    tier: 'depth',
  },

  // Core Modules
  maintenance: {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Maintenance request tracking',
    tier: 'core',
  },
  property: {
    key: 'property',
    label: 'Property',
    description: 'Property listings (buy/rent)',
    tier: 'core',
  },
  agentGateway: {
    key: 'agentGateway',
    label: 'Agent Gateway',
    description: 'Real estate agent management',
    tier: 'core',
  },
  analytics: {
    key: 'analytics',
    label: 'Analytics',
    description: 'Advanced analytics dashboard',
    tier: 'core',
  },
  adminAdvanced: {
    key: 'adminAdvanced',
    label: 'Admin (Advanced)',
    description: 'Full admin with analytics',
    tier: 'core',
  },
  education: {
    key: 'education',
    label: 'Education Portal',
    description: 'Bursaries, scholarships, and free learning resources',
    tier: 'foundation',
  },
};

// ============================================
// TIER DEFINITIONS
// ============================================

export const TIERS: Record<TierLevel, TierDefinition> = {
  foundation: {
    id: 'foundation',
    name: 'FOUNDATION',
    maxPages: 5,
    description: 'Entry tier for small communities (up to 50 units)',
    color: '#22C55E',
    modules: [
      'directory',
      'news',
      'events',
      'groups',
      'chat',
      'resources',
      'conservation',
      'adminBasic',
    ],
  },
  depth: {
    id: 'depth',
    name: 'DEPTH',
    maxPages: 15,
    description: 'Growth tier for expanding communities (up to 200 units)',
    color: '#F59E0B',
    modules: [
      'directory',
      'news',
      'events',
      'groups',
      'chat',
      'resources',
      'conservation',
      'adminBasic',
      'adminIntermediate',
      'bookings',
      'surveys',
      'marketplace',
      'externalSurveys',
    ],
  },
  core: {
    id: 'core',
    name: 'CORE',
    maxPages: -1, // unlimited
    description: 'Enterprise tier for large HOAs and property management companies',
    color: '#1E293B',
    modules: [
      'directory',
      'news',
      'events',
      'groups',
      'chat',
      'resources',
      'conservation',
      'adminBasic',
      'adminIntermediate',
      'bookings',
      'surveys',
      'marketplace',
      'externalSurveys',
      'maintenance',
      'property',
      'agentGateway',
      'analytics',
      'adminAdvanced',
    ],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a module is available for a given tier
 */
export function hasModuleAccess(tier: TierLevel, module: ModuleKey): boolean {
  const tierModules = TIERS[tier].modules;
  return tierModules.includes(module);
}

/**
 * Get all modules available for a given tier
 */
export function getTierModules(tier: TierLevel): ModuleKey[] {
  return TIERS[tier].modules;
}

// Note: Legacy tier names are no longer accepted. DB has no legacy data. See git history for removed cases.
export function getTierLevel(tier: string): TierLevel {
  switch (tier) {
    case 'foundation':
    case 'depth':
    case 'core':
      return tier as TierLevel;
    default:
      return 'foundation';
  }
}

/**
 * Get the default tier for a new tenant
 */
export function getDefaultTier(): TierLevel {
  return 'foundation';
}

/**
 * Check if tenant can access a module based on their tier
 */
export function canAccessModule(tenantTier: string, moduleKey: ModuleKey): boolean {
  const tier = getTierLevel(tenantTier);
  return hasModuleAccess(tier, moduleKey);
}

/**
 * Get max pages allowed for a tier
 */
export function getMaxPages(tier: TierLevel): number {
  return TIERS[tier].maxPages;
}

/**
 * Check if page limit would be exceeded
 */
export function canAddPage(tenantTier: string, currentPageCount: number): boolean {
  const tier = getTierLevel(tenantTier);
  const maxPages = getMaxPages(tier);
  if (maxPages === -1) return true; // unlimited
  return currentPageCount < maxPages;
}
