/**
 * Focus Spaces — Space Definition Model
 *
 * Defines the 5-space dashboard architecture per user decisions (Phase 30-B):
 * - Home, Services, Community, Messages, Admin
 * - Core spaces (home, messages, admin) are always visible
 * - Optional spaces (services, community) auto-hide when all their feature flags are disabled
 * - Maintenance merged under Services (Q1)
 * - Hybrid module gating (Q2): core always visible, optional auto-hide
 */

import type { LucideIcon } from 'lucide-react';
import { Home, Briefcase, Users, MessageSquare, Shield } from 'lucide-react';
import type { PlatformPageFlags } from '@entities/tenant/server';

// ═══════════════════════════════════════════════════════════════
// SPACE ID TYPE
// ═══════════════════════════════════════════════════════════════

/** The 5 space identifiers — URL slugs and registry keys */
export type SpaceId = 'home' | 'services' | 'community' | 'messages' | 'admin';

// ═══════════════════════════════════════════════════════════════
// SPACE DEFINITION
// ═══════════════════════════════════════════════════════════════

export interface SpaceDefinition {
  /** URL slug and registry key — matches SpaceId */
  id: SpaceId;
  /**
   * Canonical URL for this space — single source of truth for sidebar/mobile hrefs.
   * Note: `admin` points to `/admin` (Phase 37 canonical), not `/dashboard/admin`.
   */
  href: string;
  /** i18n key for display name (e.g. 'spaces.home') */
  labelKey: string;
  /** Lucide icon for sidebar / mobile bar */
  icon: LucideIcon;
  /** Core spaces (home, messages, admin) are always visible */
  isCore: boolean;
  /**
   * Feature flag that gates this space's visibility.
   * Only for optional spaces — services → 'services'.
   * Community has no single flag (auto-hides only when ALL sub-flags are off).
   */
  requiredFlag?: keyof PlatformPageFlags;
  /**
   * Minimum role required to see this space.
   * 'admin' for admin space, undefined for all others.
   */
  minimumRole?: string;
  /** Widget IDs that belong to this space (used by AddWidgetModal filtering) */
  widgetIds: string[];
}

// ═══════════════════════════════════════════════════════════════
// SPACES REGISTRY — 5-space model per user decisions
// ═══════════════════════════════════════════════════════════════

export const SPACES: Record<SpaceId, SpaceDefinition> = {
  home: {
    id: 'home',
    href: '/dashboard',
    labelKey: 'spaces.home',
    icon: Home,
    isCore: true,
    widgetIds: [
      'stats',
      'quick-actions',
      'recent-activity',
      'notifications',
      'solo-seat',
      'properties',
      'sidebar-widgets',
    ],
  },
  services: {
    id: 'services',
    href: '/dashboard/services',
    labelKey: 'spaces.services',
    icon: Briefcase,
    isCore: false,
    requiredFlag: 'services',
    widgetIds: [
      'maintenance-requests',
      'maintenance-list',
      'maintenance-analytics',
      'my-services',
      'service-inquiries',
      'events',
      'surveys',
      'competitions',
      'agent-dashboard',
      'agent-activity',
    ],
  },
  community: {
    id: 'community',
    href: '/dashboard/community',
    labelKey: 'spaces.community',
    icon: Users,
    isCore: false,
    // Community has no single requiredFlag — auto-hides when ALL sub-flags are off (Q2 hybrid)
    widgetIds: [
      'events',
      'announcements-stream',
      'my-content',
      'my-album',
      'media',
      'bookshelf',
      'premium-portfolio',
      'community-graph-widget',
      'admin-events',
      'admin-surveys',
      'group-moderation',
      'admin-announcements',
      'admin-competitions',
      'admin-resources',
      'admin-content',
    ],
  },
  messages: {
    id: 'messages',
    href: '/dashboard/messages',
    labelKey: 'spaces.messages',
    icon: MessageSquare,
    isCore: true,
    widgetIds: ['messages', 'notifications', 'admin-announcements'],
  },
  admin: {
    id: 'admin',
    href: '/admin',
    labelKey: 'spaces.admin',
    icon: Shield,
    isCore: true,
    minimumRole: 'admin',
    widgetIds: [
      'admin-stats',
      'admin-user',
      'admin-system',
      'page-settings',
      'admin-announcements',
      'admin-events',
      'admin-surveys',
      'admin-competitions',
      'admin-resources',
      'admin-content',
      'maintenance-list',
      'maintenance-analytics',
      'agent-dashboard',
      'agent-activity',
    ],
  },
};

/** Space slug list for route validation */
export const SPACE_SLUGS = Object.keys(SPACES) as SpaceId[];

// ═══════════════════════════════════════════════════════════════
// VISIBILITY LOGIC
// ═══════════════════════════════════════════════════════════════

/** Roles that can access the admin space */
const ADMIN_ROLES = ['admin', 'board', 'ADMIN', 'BOARD'];

/**
 * Get spaces visible for a given role + feature flags.
 *
 * Rules:
 * - Core spaces (home, messages) are always included
 * - Admin space only for admin/board roles
 * - Optional spaces hidden if their requiredFlag is false
 * - Community auto-hides if ALL of events, groups, surveys, competitions, news are false (Q2)
 */
export function getVisibleSpaces(role: string, flags: PlatformPageFlags): SpaceDefinition[] {
  const normalizedRole = role?.toUpperCase() || 'RESIDENT';
  const isAdmin = ADMIN_ROLES.includes(normalizedRole);

  return SPACE_SLUGS.filter(spaceId => {
    const space = SPACES[spaceId];

    // Admin space: only for admin/board roles
    if (space.minimumRole === 'admin' && !isAdmin) {
      return false;
    }

    // Core spaces: always visible (role check already done for admin)
    if (space.isCore) {
      return true;
    }

    // Optional space with a single requiredFlag
    if (space.requiredFlag) {
      return flags[space.requiredFlag] !== false;
    }

    // Community space: auto-hide if ALL sub-flags are off (Q2 hybrid decision)
    if (spaceId === 'community') {
      const communityFlags: (keyof PlatformPageFlags)[] = [
        'events',
        'groups',
        'surveys',
        'competitions',
        'news',
      ];
      const anyCommunityFeatureOn = communityFlags.some(flag => flags[flag] !== false);
      return anyCommunityFeatureOn;
    }

    // Default: show
    return true;
  }).map(spaceId => SPACES[spaceId]);
}

/**
 * Resolve a space slug to its definition.
 * Returns undefined for invalid slugs.
 */
export function resolveSpace(slug: string): SpaceDefinition | undefined {
  return SPACES[slug as SpaceId];
}

/**
 * Derive the active space ID from the current pathname.
 *
 * Recognises both the legacy `/dashboard/<slug>` pattern AND the canonical
 * `/admin/*` prefix (Phase 37 normalised admin links to `/admin`; this
 * function preserves the legacy `/dashboard/admin` route for back-compat).
 *
 * The `/admin` prefix MUST be followed by `/` or end-of-string — `/adminusers`
 * is intentionally NOT a match (avoids the false-positive on slug-less paths).
 *
 * Returns `'home'` for empty, unknown, or non-matching pathnames.
 *
 * Phase 48: extracted from `(tenant)/dashboard/layout.tsx` into the model
 * layer so it can be unit-tested and shared by the new `SpaceChrome` client
 * component (mounted by both dashboard and admin layouts).
 */
export function getActiveSpaceId(pathname: string): SpaceId | 'home' {
  if (!pathname) return 'home';

  // /admin and /admin/... → admin space (canonical route, Phase 37)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return 'admin';
  }

  // /dashboard/<slug> → matched space (includes legacy /dashboard/admin back-compat)
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  if (match) {
    const slug = match[1];
    const resolved = resolveSpace(slug);
    if (resolved) {
      return resolved.id;
    }
  }

  return 'home';
}

// ═══════════════════════════════════════════════════════════════
// WIDGET-SPACE HELPERS (Phase 30-B)
// ═══════════════════════════════════════════════════════════════

/**
 * Get all widget IDs that belong to a given space.
 * Uses the SPACES registry's widgetIds array.
 */
export function getWidgetsForSpace(spaceId: SpaceId): string[] {
  return SPACES[spaceId]?.widgetIds ?? [];
}

/**
 * Check if a widget belongs to a given space.
 * A widget belongs if its ID appears in the space's widgetIds.
 */
export function isWidgetInSpace(widgetId: string, spaceId: SpaceId): boolean {
  const space = SPACES[spaceId];
  if (!space) return false;
  return space.widgetIds.includes(widgetId);
}

/**
 * Get all spaces that contain a given widget.
 * Useful for showing "also available in X" badges.
 */
export function getSpacesForWidget(widgetId: string): SpaceId[] {
  return SPACE_SLUGS.filter(spaceId => SPACES[spaceId].widgetIds.includes(widgetId));
}

// ═══════════════════════════════════════════════════════════════
// ADMIN SUB-DOMAINS (Phase 30-B)
// ═══════════════════════════════════════════════════════════════

/**
 * Admin management domains. These mirror the Admin Dashboard tab inventory
 * defined in docs/architecture/NAVIGATION_GOVERNANCE.md.
 * When adding a new admin domain, update both this constant AND the governance doc.
 */
export const ADMIN_DOMAINS = [
  'users',
  'maintenance',
  'content',
  'events',
  'competitions',
  'resources',
  'surveys',
  'announcements',
  'system',
] as const;

export type AdminDomain = (typeof ADMIN_DOMAINS)[number];

/**
 * Map admin domain to widget IDs rendered on that domain's page.
 * Multiple widgets per domain are rendered in vertical stack.
 */
const ADMIN_DOMAIN_WIDGET_MAP: Record<AdminDomain, string[]> = {
  users: ['admin-user'],
  maintenance: ['maintenance-list', 'maintenance-analytics'],
  content: ['admin-content'],
  events: ['admin-events'],
  competitions: ['admin-competitions'],
  resources: ['admin-resources'],
  surveys: ['admin-surveys'],
  announcements: ['admin-announcements'],
  system: ['admin-system', 'page-settings'],
};

/**
 * Get widget IDs for an admin management domain.
 * Returns empty array for invalid domains.
 */
export function getAdminDomainWidgets(domain: string): string[] {
  return ADMIN_DOMAIN_WIDGET_MAP[domain as AdminDomain] ?? [];
}

// ═══════════════════════════════════════════════════════════════
// MESSAGES SUB-ROUTES (Phase 30-B — Q4)
// ═══════════════════════════════════════════════════════════════

/** Sub-routes within the Messages space (e.g., /dashboard/messages/announcements) */
export const MESSAGES_SUB_ROUTES = ['conversations', 'announcements', 'notifications'] as const;
export type MessagesSubRoute = (typeof MESSAGES_SUB_ROUTES)[number];

// ═══════════════════════════════════════════════════════════════
// SERVICES SUB-DOMAINS (Phase 38)
// ═══════════════════════════════════════════════════════════════

/**
 * Service domains within the Services space.
 * These mirror the domain definitions in ServicesSubLauncher.
 * When adding a new service domain, update this constant AND ServicesSubLauncher.
 */
export const SERVICES_DOMAINS = [
  'maintenance',
  'bookings',
  'amenities',
  'my-services',
  'events',
  'surveys',
  'competitions',
] as const;

export type ServicesDomain = (typeof SERVICES_DOMAINS)[number];

/** Widget mapping for service domains — maps each domain to its widget IDs */
const SERVICES_DOMAIN_WIDGET_MAP: Record<ServicesDomain, string[]> = {
  maintenance: ['maintenance-requests'],
  bookings: [],
  amenities: [],
  'my-services': [],
  events: ['events'],
  surveys: ['surveys'],
  competitions: ['competitions'],
};

/**
 * Get widget IDs for a service domain.
 * Returns empty array for invalid or widget-less domains.
 */
export function getServicesDomainWidgets(domain: string): string[] {
  return SERVICES_DOMAIN_WIDGET_MAP[domain as ServicesDomain] ?? [];
}

// ═══════════════════════════════════════════════════════════════
// MESSAGES SUB-DOMAINS (Phase 38)
// ═══════════════════════════════════════════════════════════════

/**
 * Communication domains within the Messages space.
 * These mirror the domain definitions in MessagesSubLauncher.
 * When adding a new messages domain, update this constant AND MessagesSubLauncher.
 */
export const MESSAGES_DOMAINS = ['conversations', 'announcements', 'notifications'] as const;

export type MessagesDomain = (typeof MESSAGES_DOMAINS)[number];

/** Widget mapping for message domains — maps each domain to its widget IDs */
const MESSAGES_DOMAIN_WIDGET_MAP: Record<MessagesDomain, string[]> = {
  conversations: [],
  announcements: ['admin-announcements'],
  notifications: [],
};

/**
 * Get widget IDs for a messages domain.
 * Returns empty array for invalid or widget-less domains.
 */
export function getMessagesDomainWidgets(domain: string): string[] {
  return MESSAGES_DOMAIN_WIDGET_MAP[domain as MessagesDomain] ?? [];
}
