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
import type { PlatformPageFlags } from '@entities/tenant/api/flags/platform-flags';

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
    labelKey: 'spaces.home',
    icon: Home,
    isCore: true,
    widgetIds: ['stats', 'quick-actions', 'recent-activity', 'notifications'],
  },
  services: {
    id: 'services',
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
    ],
  },
  community: {
    id: 'community',
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
    labelKey: 'spaces.messages',
    icon: MessageSquare,
    isCore: true,
    widgetIds: ['messages', 'notifications'],
  },
  admin: {
    id: 'admin',
    labelKey: 'spaces.admin',
    icon: Shield,
    isCore: true,
    minimumRole: 'admin',
    widgetIds: [
      'admin-stats',
      'admin-activity',
      'admin-quick-links',
      'admin-user',
      'admin-system',
      'page-settings',
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
