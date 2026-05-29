import { Permission } from '@/entities/tenant/api/permissions';
import { PlatformPageFlags } from '@/entities/tenant/api/flags/platform-flags';

export interface NavItem {
  id: string;
  nameKey: string;
  href: string;
  flag?: keyof PlatformPageFlags;
  permission?: keyof Permission;
  isPublic?: boolean;
}

/**
 * Centralized registry of all navigation items.
 * Maps items to feature flags and required permissions.
 */
export const NAV_REGISTRY: NavItem[] = [
  { id: 'home', nameKey: 'nav.home', href: '/', isPublic: true },
  {
    id: 'directory',
    nameKey: 'nav.directory',
    href: '/directory',
    flag: 'directory',
    permission: 'directory',
  },
  { id: 'groups', nameKey: 'nav.groups', href: '/groups', flag: 'groups', permission: 'groups' },
  { id: 'services', nameKey: 'nav.services', href: '/services', flag: 'services' },
  { id: 'resources', nameKey: 'nav.resources', href: '/resources', flag: 'resources' },
  { id: 'news', nameKey: 'nav.news', href: '/news', flag: 'news', permission: 'content' },
  {
    id: 'maintenance',
    nameKey: 'nav.maintenance',
    href: '/maintenance',
    flag: 'maintenance',
    permission: 'requests',
  },
  { id: 'surveys', nameKey: 'nav.surveys', href: '/surveys', flag: 'surveys' },
  { id: 'competition', nameKey: 'nav.competition', href: '/competition', flag: 'competitions' },
  { id: 'conservation', nameKey: 'nav.conservation', href: '/conservation', flag: 'conservation' },
  { id: 'campaign', nameKey: 'nav.campaign', href: '/campaign', flag: 'campaign' },
  { id: 'dashboard', nameKey: 'nav.dashboard', href: '/dashboard' },
  {
    id: 'bookings',
    nameKey: 'nav.bookings',
    href: '/bookings',
    flag: 'bookings',
    permission: 'bookings',
  },
  { id: 'messages', nameKey: 'nav.messages', href: '/messages', permission: 'messages' },

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD FOCUS SPACES (Phase 30-B)
  // Internal workspace navigation — supplements the main dashboard entry
  // ═══════════════════════════════════════════════════════════════
  { id: 'dashboard-home', nameKey: 'spaces.home', href: '/dashboard' },
  {
    id: 'dashboard-services',
    nameKey: 'spaces.services',
    href: '/dashboard/services',
    flag: 'services',
  },
  { id: 'dashboard-community', nameKey: 'spaces.community', href: '/dashboard/community' },
  {
    id: 'dashboard-messages',
    nameKey: 'spaces.messages',
    href: '/dashboard/messages',
    flag: 'messages',
  },
  { id: 'dashboard-admin', nameKey: 'spaces.admin', href: '/admin', permission: 'admin' },
];

export const ADMIN_NAV_REGISTRY: NavItem[] = [
  { id: 'admin_overview', nameKey: 'admin.overview', href: '/admin', permission: 'admin' },
  { id: 'admin_users', nameKey: 'admin.users', href: '/admin/users', permission: 'users' },
  {
    id: 'admin_requests',
    nameKey: 'admin.requests',
    href: '/admin/requests',
    permission: 'requests',
  },
  { id: 'admin_content', nameKey: 'admin.content', href: '/admin/content', permission: 'content' },
  { id: 'admin_groups', nameKey: 'admin.groups', href: '/admin/groups', permission: 'groups' },
];
