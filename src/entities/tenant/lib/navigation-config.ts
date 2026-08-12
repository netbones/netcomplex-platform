/**
 * Navigation Configuration — Single Source of Truth
 *
 * All navigation items are defined here and consumed by Header, MobileMenu,
 * SideDrawer, and Footer. Follows NAVIGATION_GOVERNANCE.md taxonomy:
 * explore, community, workspace, admin.
 *
 * Header link selection is controlled by flags.headerLinks — an ordered array
 * of up to 4 page IDs chosen from LINK_ID_TO_ITEM. Home is always first.
 */

import type { PlatformPageFlags } from '../api/flags/platform-flags';
import { hasPermission } from '@shared/lib';
import type { Permission } from '@shared/lib';

export interface NavItem {
  href: string;
  labelKey: string;
  adminLabelKey?: string;
  icon?: string;
  flagKey?: keyof PlatformPageFlags;
  section: 'explore' | 'community' | 'workspace' | 'admin';
  requiresAuth?: boolean;
  permissionKey?: keyof Permission;
}

const STATIC_HEADER_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.home', section: 'explore', icon: 'home' },
  {
    href: '/directory',
    labelKey: 'nav.directory',
    section: 'explore',
    flagKey: 'directory',
    icon: 'users',
  },
  {
    href: '/services',
    labelKey: 'nav.services',
    section: 'explore',
    flagKey: 'services',
    icon: 'shield',
  },
  {
    href: '/resources',
    labelKey: 'nav.resources',
    section: 'explore',
    flagKey: 'resources',
    icon: 'file',
  },
  {
    href: '/education',
    labelKey: 'nav.education',
    section: 'explore',
    flagKey: 'education',
    icon: 'graduation-cap',
  },
];

const CONSERVATION_NAV_ITEM: NavItem = {
  href: '/conservation',
  labelKey: 'nav.conservation',
  section: 'explore',
  flagKey: 'conservation',
  icon: 'heart',
};

const CAMPAIGN_NAV_ITEM: NavItem = {
  href: '/campaign',
  labelKey: 'nav.campaign',
  section: 'explore',
  flagKey: 'campaign',
  icon: 'tags',
};

export const PUBLIC_HEADER_ITEMS: NavItem[] = [...STATIC_HEADER_ITEMS, CONSERVATION_NAV_ITEM];

const MORE_DROPDOWN_ITEMS: NavItem[] = [
  { href: '/news', labelKey: 'nav.news', section: 'community', flagKey: 'news', icon: 'mail' },
  {
    href: '/groups',
    labelKey: 'nav.groups',
    section: 'community',
    flagKey: 'groups',
    icon: 'users',
  },
  {
    href: '/surveys',
    labelKey: 'nav.surveys',
    section: 'community',
    flagKey: 'surveys',
    icon: 'chart',
  },
  {
    href: '/competition',
    labelKey: 'nav.competition',
    section: 'community',
    flagKey: 'competitions',
    icon: 'tags',
  },
  {
    href: '/events',
    labelKey: 'nav.events',
    section: 'community',
    flagKey: 'events',
    icon: 'calendar',
  },
];

export const WORKSPACE_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'nav.dashboard',
    section: 'workspace',
    flagKey: 'dashboard',
    requiresAuth: true,
    icon: 'home',
  },
  {
    href: '/amenities',
    labelKey: 'nav.amenities',
    section: 'workspace',
    flagKey: 'bookings',
    requiresAuth: true,
    icon: 'calendar',
  },
  {
    href: '/messages',
    labelKey: 'nav.messages',
    section: 'workspace',
    flagKey: 'messages',
    requiresAuth: true,
    icon: 'mail',
  },
  {
    href: '/maintenance',
    labelKey: 'nav.maintenance',
    section: 'workspace',
    flagKey: 'maintenance',
    requiresAuth: true,
    icon: 'tool',
  },
  {
    href: '/notifications',
    labelKey: 'nav.notifications',
    section: 'workspace',
    requiresAuth: true,
    icon: 'bell',
  },
  {
    href: '/profile',
    labelKey: 'nav.settings',
    section: 'workspace',
    requiresAuth: true,
    icon: 'cog',
  },
];

export const COMMUNITY_ITEMS = MORE_DROPDOWN_ITEMS;

export const ADMIN_ITEMS: NavItem[] = [
  {
    href: '/admin',
    adminLabelKey: 'dashboard',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'admin',
    icon: 'shield',
  },
  {
    href: '/admin/users',
    adminLabelKey: 'users',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'users',
    icon: 'users',
  },
  {
    href: '/admin/groups',
    adminLabelKey: 'groups',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'groups',
    icon: 'users',
  },
  {
    href: '/admin/content',
    adminLabelKey: 'content',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'file',
  },
  {
    href: '/admin/requests',
    adminLabelKey: 'requests',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'requests',
    icon: 'tool',
  },
  {
    href: '/admin/surveys',
    adminLabelKey: 'surveys',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'chart',
  },
  {
    href: '/admin/merits',
    adminLabelKey: 'merits',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'users',
    icon: 'shield',
  },
  {
    href: '/admin/external-surveys',
    adminLabelKey: 'externalSurveys',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'external-link-alt',
  },
  {
    href: '/admin/categories',
    adminLabelKey: 'categories',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'tags',
  },
  {
    href: '/admin/education',
    adminLabelKey: 'education',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'graduation-cap',
  },
  {
    href: '/admin/carousel',
    adminLabelKey: 'carousel',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'image',
  },
  {
    href: '/admin/campaigns',
    adminLabelKey: 'campaigns',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'bullhorn',
  },
  {
    href: '/setup',
    labelKey: 'nav.setup',
    section: 'admin',
    permissionKey: 'admin',
    icon: 'clipboard-check',
  },
];

export interface BurgerSections {
  explore: NavItem[];
  community: NavItem[];
  workspace: NavItem[];
  admin: NavItem[];
}

function isItemVisible(item: NavItem, flags?: PlatformPageFlags | null): boolean {
  if (!item.flagKey) return true;
  if (!flags) return false;

  const flagValue = flags[item.flagKey];

  if (item.flagKey === 'conservation') {
    return flagValue !== 'external';
  }

  if (item.flagKey === 'campaign') {
    return flagValue !== false;
  }

  return flagValue !== false;
}

const HOME_ITEM: NavItem = STATIC_HEADER_ITEMS[0];

const LINK_ID_TO_ITEM: Record<string, NavItem> = {
  directory: STATIC_HEADER_ITEMS[1],
  services: STATIC_HEADER_ITEMS[2],
  resources: STATIC_HEADER_ITEMS[3],
  education: STATIC_HEADER_ITEMS[4],
  conservation: CONSERVATION_NAV_ITEM,
  campaign: CAMPAIGN_NAV_ITEM,
  news: MORE_DROPDOWN_ITEMS[0],
  groups: MORE_DROPDOWN_ITEMS[1],
  surveys: MORE_DROPDOWN_ITEMS[2],
  competitions: MORE_DROPDOWN_ITEMS[3],
};

export function getHeaderItems(flags?: PlatformPageFlags | null): NavItem[] {
  const items: NavItem[] = [HOME_ITEM];
  const linkIds = flags?.headerLinks ?? [];

  for (const id of linkIds) {
    const item = LINK_ID_TO_ITEM[id];
    if (item && isItemVisible(item, flags)) {
      items.push(item);
    }
  }

  return items.slice(0, 5);
}

export function getMoreDropdownItems(flags?: PlatformPageFlags | null): NavItem[] {
  const headerIds: Set<string> = new Set(flags?.headerLinks ?? []);
  const items: NavItem[] = [];

  for (const item of MORE_DROPDOWN_ITEMS) {
    // Skip items already in header
    const mappedId = Object.entries(LINK_ID_TO_ITEM).find(([, v]) => v === item)?.[0];
    if (mappedId && headerIds.has(mappedId)) continue;
    if (isItemVisible(item, flags)) {
      items.push(item);
    }
  }

  // Add campaign/conservation if not in header
  for (const id of ['campaign', 'conservation'] as const) {
    if (!headerIds.has(id)) {
      const item = LINK_ID_TO_ITEM[id];
      if (item && isItemVisible(item, flags)) {
        items.push(item);
      }
    }
  }

  return items;
}

export function getWorkspaceItems(
  flags?: PlatformPageFlags | null,
  isAuthenticated?: boolean
): NavItem[] {
  if (!isAuthenticated) return [];

  return WORKSPACE_ITEMS.filter(item => isItemVisible(item, flags));
}

export function getAdminItems(role: string | null | undefined): NavItem[] {
  if (!role) return [];

  return ADMIN_ITEMS.filter(item => {
    if (!item.permissionKey) return true;
    return hasPermission(role, item.permissionKey);
  });
}

export function getBurgerSections(
  flags?: PlatformPageFlags | null,
  isAuthenticated?: boolean,
  role?: string | null
): BurgerSections {
  return {
    explore: getHeaderItems(flags),
    community: getMoreDropdownItems(flags),
    workspace: getWorkspaceItems(flags, isAuthenticated),
    admin: getAdminItems(role),
  };
}
