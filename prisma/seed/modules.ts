/**
 * NetComplex Platform Module Seed Data
 *
 * Canonical module registry for NetComplex platform features.
 * These modules define what's available across all tenants.
 *
 * @see docs/netcomplex-module-architecture-2026-04-22.md
 */
export const PLATFORM_MODULES = [
  // ── Core modules — always on for all tiers ──────────────────────────
  {
    key: 'dashboard',
    label: 'Dashboard',
    minTier: 'standard' as const,
    defaultEnabled: true,
    description: 'Resident dashboard with widgets and activity feed',
  },
  {
    key: 'auth',
    label: 'Authentication',
    minTier: 'standard' as const,
    defaultEnabled: true,
    description: 'Login, registration, and session management',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    minTier: 'standard' as const,
    defaultEnabled: true,
    description: 'In-app notifications and alerts',
  },
  {
    key: 'settings',
    label: 'Settings',
    minTier: 'standard' as const,
    defaultEnabled: true,
    description: 'Tenant settings, branding, and user preferences',
  },

  // ── Standard modules ────────────────────────────────────────────────
  {
    key: 'directory',
    label: 'Directory',
    minTier: 'standard' as const,
    defaultEnabled: true,
    description: 'Resident directory with profiles',
  },
  {
    key: 'groups',
    label: 'Interest Groups',
    minTier: 'standard' as const,
    defaultEnabled: true,
    description: 'Community groups and member management',
  },
  {
    key: 'maintenance',
    label: 'Maintenance Requests',
    minTier: 'standard' as const,
    defaultEnabled: true,
    description: 'Asset-linked maintenance request tracking',
  },
  {
    key: 'community-services',
    label: 'Community Services',
    minTier: 'standard' as const,
    defaultEnabled: true,
    description: 'Service provider directory and inquiries',
  },
  {
    key: 'content',
    label: 'Content Management',
    minTier: 'standard' as const,
    defaultEnabled: true,
    description: 'Articles, announcements, and campaigns via TipTap',
  },

  // ── Premium modules ──────────────────────────────────────────────
  {
    key: 'bookings',
    label: 'Facility Booking',
    minTier: 'premium' as const,
    defaultEnabled: false,
    description: 'Reserve amenities and common areas',
  },
  {
    key: 'premium-seats',
    label: 'Premium Seats',
    minTier: 'premium' as const,
    defaultEnabled: false,
    description: 'Agent marketplace and premium membership seats',
  },
  {
    key: 'property-listings',
    label: 'Property Listings',
    minTier: 'premium' as const,
    defaultEnabled: false,
    description: 'Buy/rent/lease property listings',
  },

  // ── Enterprise modules ─────────────────────────────────────────
  {
    key: 'agent-marketplace',
    label: 'Agent Marketplace',
    minTier: 'enterprise' as const,
    defaultEnabled: false,
    description: 'Managed agent assignments and commissions',
  },
  {
    key: 'white-label',
    label: 'White Label',
    minTier: 'enterprise' as const,
    defaultEnabled: false,
    description: 'Custom domain and full branding control',
  },
] as const;

export type PlatformModuleSeed = (typeof PLATFORM_MODULES)[number];
