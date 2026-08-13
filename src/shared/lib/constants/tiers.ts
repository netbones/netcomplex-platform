export type TierLevel = 'core' | 'foundation' | 'pro-max';

export type ModuleKey =
  | 'directory'
  | 'news'
  | 'events'
  | 'groups'
  | 'chat'
  | 'resources'
  | 'conservation'
  | 'education'
  | 'adminBasic'
  | 'bookings'
  | 'surveys'
  | 'surveysAdvanced'
  | 'maintenance'
  | 'maintenanceTicketing'
  | 'marketplace'
  | 'externalSurveys'
  | 'merits'
  | 'dWallet'
  | 'property'
  | 'agentGateway'
  | 'analytics'
  | 'adminIntermediate'
  | 'adminAdvanced'
  | 'proxyVote'
  | 'security';

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  tier: TierLevel;
}

export interface TierLimits {
  announcements: number;
  surveys: number;
  events: number;
  apiRequestsPerDay: number;
}

export interface TierDefinition {
  id: TierLevel;
  name: string;
  maxUsers: number;
  storageGB: number;
  description: string;
  color: string;
  modules: ModuleKey[];
  limits: TierLimits;
}

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  directory: {
    key: 'directory',
    label: 'Directory',
    description: 'Resident directory with search and profiles',
    tier: 'core',
  },
  news: {
    key: 'news',
    label: 'News',
    description: 'Community news and announcements',
    tier: 'core',
  },
  events: {
    key: 'events',
    label: 'Events',
    description: 'Community events calendar',
    tier: 'core',
  },
  groups: {
    key: 'groups',
    label: 'Groups',
    description: 'Interest groups and memberships',
    tier: 'core',
  },
  chat: {
    key: 'chat',
    label: 'Chat',
    description: 'Real-time community messaging',
    tier: 'core',
  },
  resources: {
    key: 'resources',
    label: 'Resources',
    description: 'Community library/bookshelf',
    tier: 'core',
  },
  conservation: {
    key: 'conservation',
    label: 'Conservation',
    description: 'Conservation area features',
    tier: 'core',
  },
  education: {
    key: 'education',
    label: 'Education Portal',
    description: 'Bursaries, scholarships, and free learning resources',
    tier: 'core',
  },
  adminBasic: {
    key: 'adminBasic',
    label: 'Admin (Basic)',
    description: 'Basic community administration',
    tier: 'core',
  },
  bookings: {
    key: 'bookings',
    label: 'Bookings',
    description: 'Free facility booking — calendar view, reservations',
    tier: 'core',
  },
  surveys: {
    key: 'surveys',
    label: 'Surveys',
    description: 'Basic surveys — create, respond, view results',
    tier: 'core',
  },
  maintenance: {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Basic maintenance — submit and track requests',
    tier: 'core',
  },
  adminIntermediate: {
    key: 'adminIntermediate',
    label: 'Admin (Intermediate)',
    description: 'Expanded admin for growing communities',
    tier: 'foundation',
  },
  surveysAdvanced: {
    key: 'surveysAdvanced',
    label: 'Surveys (Advanced)',
    description: 'Advanced survey builder — 6 types, sections, images, drag-drop reorder',
    tier: 'foundation',
  },
  marketplace: {
    key: 'marketplace',
    label: 'Marketplace',
    description: 'Services directory and provider marketplace',
    tier: 'foundation',
  },
  externalSurveys: {
    key: 'externalSurveys',
    label: 'External Surveys',
    description: 'Third-party survey integration',
    tier: 'foundation',
  },
  merits: {
    key: 'merits',
    label: 'Community Merits',
    description: 'Community merits, standing tiers, and engagement scoring',
    tier: 'foundation',
  },
  dWallet: {
    key: 'dWallet',
    label: 'Data Wallet',
    description: 'Per-resident data rights, consent, and revenue-share (optional addendum)',
    tier: 'foundation',
  },
  maintenanceTicketing: {
    key: 'maintenanceTicketing',
    label: 'Maintenance Ticketing',
    description: 'Full ticketing — teams, assignments, 7-status workflow, providers',
    tier: 'pro-max',
  },
  property: {
    key: 'property',
    label: 'Property',
    description: 'Property listings (buy/rent)',
    tier: 'pro-max',
  },
  agentGateway: {
    key: 'agentGateway',
    label: 'Agent Gateway',
    description: 'Real estate agent management',
    tier: 'pro-max',
  },
  analytics: {
    key: 'analytics',
    label: 'Analytics',
    description: 'Advanced analytics dashboard',
    tier: 'pro-max',
  },
  adminAdvanced: {
    key: 'adminAdvanced',
    label: 'Admin (Advanced)',
    description: 'Full admin with analytics',
    tier: 'pro-max',
  },
  proxyVote: {
    key: 'proxyVote',
    label: 'Proxy Vote',
    description: 'HOA governance proxy appointments and resident nominations',
    tier: 'pro-max',
  },
  security: {
    key: 'security',
    label: 'Security',
    description: 'Panic button and community security contacts',
    tier: 'core',
  },
};

export const TIERS: Record<TierLevel, TierDefinition> = {
  core: {
    id: 'core',
    name: 'CORE',
    maxUsers: 50,
    storageGB: 0.5,
    description: 'Entry tier for small communities (up to 50 residents)',
    color: '#22C55E',
    modules: [
      'directory',
      'news',
      'events',
      'groups',
      'chat',
      'resources',
      'conservation',
      'education',
      'adminBasic',
      'bookings',
      'surveys',
      'maintenance',
      'security',
    ],
    limits: {
      announcements: 5,
      surveys: 5,
      events: 10,
      apiRequestsPerDay: 1000,
    },
  },
  foundation: {
    id: 'foundation',
    name: 'FOUNDATION',
    maxUsers: 200,
    storageGB: 5,
    description: 'Growth tier for expanding communities (up to 200 residents)',
    color: '#F59E0B',
    modules: [
      'directory',
      'news',
      'events',
      'groups',
      'chat',
      'resources',
      'conservation',
      'education',
      'adminBasic',
      'bookings',
      'surveys',
      'maintenance',
      'security',
      'adminIntermediate',
      'surveysAdvanced',
      'marketplace',
      'externalSurveys',
      'merits',
      'dWallet',
    ],
    limits: {
      announcements: 20,
      surveys: 20,
      events: 50,
      apiRequestsPerDay: 5000,
    },
  },
  'pro-max': {
    id: 'pro-max',
    name: 'ENTERPRISE',
    maxUsers: -1,
    storageGB: 50,
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
      'education',
      'adminBasic',
      'bookings',
      'surveys',
      'maintenance',
      'security',
      'adminIntermediate',
      'surveysAdvanced',
      'marketplace',
      'externalSurveys',
      'merits',
      'dWallet',
      'maintenanceTicketing',
      'property',
      'agentGateway',
      'analytics',
      'adminAdvanced',
      'proxyVote',
    ],
    limits: {
      announcements: -1,
      surveys: -1,
      events: -1,
      apiRequestsPerDay: -1,
    },
  },
};

export function hasModuleAccess(tier: TierLevel, module: ModuleKey): boolean {
  const tierModules = TIERS[tier].modules;
  return tierModules.includes(module);
}

export function getTierModules(tier: TierLevel): ModuleKey[] {
  return TIERS[tier].modules;
}

export function getTierLevel(tier: string): TierLevel {
  switch (tier) {
    case 'core':
    case 'foundation':
    case 'pro-max':
      return tier as TierLevel;
    default:
      return 'core';
  }
}

export function getDefaultTier(): TierLevel {
  return 'core';
}

export function canAccessModule(tenantTier: string, moduleKey: ModuleKey): boolean {
  const tier = getTierLevel(tenantTier);
  return hasModuleAccess(tier, moduleKey);
}
