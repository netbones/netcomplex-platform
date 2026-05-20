/**
 * Navigation Configuration — Single Source of Truth
 *
 * All navigation items are defined here and consumed by Header, MobileMenu,
 * SideDrawer, and Footer. Follows NAVIGATION_GOVERNANCE.md taxonomy:
 * explore, community, workspace, admin.
 *
 * Conservation/Campaign mutual exclusion is encoded here, not in components.
 */

import type { PlatformPageFlags } from '@entities/tenant/api/flags/platform-flags';
import { hasPermission } from '@entities/tenant/api/permissions';
import type { Permission } from '@entities/tenant/api/permissions';

export interface NavItem {
  href: string;
  labelKey: string; // i18n key, e.g. 'nav.home'
  adminLabelKey?: string; // for admin labels, e.g. 'admin.users'
  icon?: string; // icon name for SideDrawer
  flagKey?: keyof PlatformPageFlags; // which page flag gates this item
  section: 'explore' | 'community' | 'workspace' | 'admin';
  requiresAuth?: boolean; // true = only show when logged in
  permissionKey?: keyof Permission; // for admin items
}

// ─── PUBLIC HEADER ITEMS (max 5 nav items + More dropdown) ────────────────

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

export const PUBLIC_HEADER_ITEMS: NavItem[] = [
  ...STATIC_HEADER_ITEMS,
  CONSERVATION_NAV_ITEM, // default; getHeaderItems dynamically selects
];

// ─── MORE DROPDOWN ITEMS (Community items) ─────────────────────────────────

const MORE_DROPDOWN_ITEMS: NavItem[] = [
  { href: '/news', labelKey: 'nav.news', section: 'community', flagKey: 'news', icon: 'mail' },
  {
    href: '/groups',
    labelKey: 'nav.groups',
    section: 'community',
    flagKey: 'groups',
    icon: 'users',
  },
  // Conservation/Campaign slot is dynamic — populated by getMoreDropdownItems
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

// ─── WORKSPACE ITEMS ────────────────────────────────────────────────────────

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
    href: '/messages',
    labelKey: 'nav.messages',
    section: 'workspace',
    flagKey: 'messages',
    requiresAuth: true,
    icon: 'mail',
  },
  {
    href: '/bookings',
    labelKey: 'nav.bookings',
    section: 'workspace',
    flagKey: 'bookings',
    requiresAuth: true,
    icon: 'calendar',
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
    href: '/settings',
    labelKey: 'nav.settings',
    section: 'workspace',
    requiresAuth: true,
    icon: 'cog',
  },
];

// ─── COMMUNITY ITEMS (alias for More dropdown — same items, used by burger) ─

export const COMMUNITY_ITEMS = MORE_DROPDOWN_ITEMS;

// ─── ADMIN ITEMS ────────────────────────────────────────────────────────────

export const ADMIN_ITEMS: NavItem[] = [
  {
    href: '/admin',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'admin',
    icon: 'shield',
  },
  {
    href: '/admin/users',
    adminLabelKey: 'admin.users',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'users',
    icon: 'users',
  },
  {
    href: '/admin/groups',
    adminLabelKey: 'admin.adminGroups',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'groups',
    icon: 'users',
  },
  {
    href: '/admin/content',
    adminLabelKey: 'admin.adminContent',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'file',
  },
  {
    href: '/admin/requests',
    adminLabelKey: 'admin.requests',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'requests',
    icon: 'tool',
  },
  {
    href: '/admin/surveys',
    adminLabelKey: 'admin.adminSurveys',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'chart',
  },
  {
    href: '/admin/external-surveys',
    adminLabelKey: 'admin.adminExternal',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'external-link-alt',
  },
  {
    href: '/admin/categories',
    adminLabelKey: 'admin.adminCategories',
    labelKey: 'nav.admin',
    section: 'admin',
    permissionKey: 'content',
    icon: 'tags',
  },
];

// ─── BURGER MENU SECTIONS ───────────────────────────────────────────────────

export interface BurgerSections {
  explore: NavItem[];
  community: NavItem[];
  workspace: NavItem[];
  admin: NavItem[];
}

// ─── FILTERING FUNCTIONS ────────────────────────────────────────────────────

/**
 * Check if a nav item is visible given the current page flags.
 * - If the item has no flagKey, it's always visible (e.g. Home).
 * - Conservation uses a special check: 'external' mode hides the local page.
 * - Boolean flags: false means hidden.
 */
function isItemVisible(item: NavItem, flags?: PlatformPageFlags | null): boolean {
  if (!item.flagKey) return true; // e.g. Home
  if (!flags) return false;

  const flagValue = flags[item.flagKey];

  // Conservation uses a tri-state: 'default' | 'managed' | 'external'
  if (item.flagKey === 'conservation') {
    return flagValue !== 'external';
  }

  // Campaign is a boolean flag
  if (item.flagKey === 'campaign') {
    return flagValue !== false;
  }

  // All other flags are boolean
  return flagValue !== false;
}

/**
 * Returns the 4-5 header items (Home + 3 static + dynamic Conservation/Campaign).
 * Max 5 items — the 6th is the "More" dropdown trigger (rendered by Header, not a NavItem).
 */
export function getHeaderItems(flags?: PlatformPageFlags | null): NavItem[] {
  const items: NavItem[] = [];

  // Static items: Home, Directory, Services, Resources
  for (const item of STATIC_HEADER_ITEMS) {
    if (isItemVisible(item, flags)) {
      items.push(item);
    }
  }

  // Dynamic 5th item: Conservation or Campaign based on headerEngagementFocus
  const focus = flags?.headerEngagementFocus ?? 'conservation';

  if (focus === 'conservation') {
    if (isItemVisible(CONSERVATION_NAV_ITEM, flags)) {
      items.push(CONSERVATION_NAV_ITEM);
    }
  } else {
    if (isItemVisible(CAMPAIGN_NAV_ITEM, flags)) {
      items.push(CAMPAIGN_NAV_ITEM);
    }
  }

  // Enforce max 5 items (should naturally be 5 or fewer)
  return items.slice(0, 5);
}

/**
 * Returns community items for the More dropdown, including whichever
 * of Conservation/Campaign is NOT in the header.
 */
export function getMoreDropdownItems(flags?: PlatformPageFlags | null): NavItem[] {
  const focus = flags?.headerEngagementFocus ?? 'conservation';
  const items: NavItem[] = [];

  // Add the dynamic engagement item (the one NOT in header)
  if (focus === 'conservation') {
    // Campaign goes to More dropdown
    if (isItemVisible(CAMPAIGN_NAV_ITEM, flags)) {
      items.push(CAMPAIGN_NAV_ITEM);
    }
  } else {
    // Conservation goes to More dropdown
    if (isItemVisible(CONSERVATION_NAV_ITEM, flags)) {
      items.push(CONSERVATION_NAV_ITEM);
    }
  }

  // Add static community items
  for (const item of MORE_DROPDOWN_ITEMS) {
    if (isItemVisible(item, flags)) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Returns workspace items filtered by flags and auth status.
 * Unauthenticated users see nothing.
 */
export function getWorkspaceItems(
  flags?: PlatformPageFlags | null,
  isAuthenticated?: boolean
): NavItem[] {
  if (!isAuthenticated) return [];

  return WORKSPACE_ITEMS.filter(item => isItemVisible(item, flags));
}

/**
 * Returns admin items filtered by role permissions.
 */
export function getAdminItems(role: string | null | undefined): NavItem[] {
  if (!role) return [];

  return ADMIN_ITEMS.filter(item => {
    if (!item.permissionKey) return true;
    return hasPermission(role, item.permissionKey);
  });
}

/**
 * Returns the 4-section burger structure per NAVIGATION_GOVERNANCE.md.
 * Explore + Community are always shown; Workspace requires auth; Admin requires role.
 */
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
