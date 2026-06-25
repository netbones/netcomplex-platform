import { describe, it, expect } from 'vitest';
import {
  getHeaderItems,
  getMoreDropdownItems,
  getWorkspaceItems,
  getAdminItems,
  getBurgerSections,
} from '@entities/tenant';
import type { PlatformPageFlags } from '@entities/tenant/server';

const defaultFlags: PlatformPageFlags = {
  campaign: true,
  conservation: 'default',
  conservationExternalUrl: '',
  chat: true,
  news: true,
  events: true,
  directory: true,
  groups: true,
  services: true,
  resources: true,
  maintenance: true,
  surveys: true,
  competitions: true,
  dashboard: true,
  bookings: true,
  messages: true,
  providers: true,
  headerLinks: ['directory', 'groups', 'services', 'resources'],
};

describe('getHeaderItems', () => {
  it('returns Home + 4 chosen links with default flags', () => {
    const items = getHeaderItems(defaultFlags);
    expect(items[0].href).toBe('/'); // Home always first
    expect(items[1].href).toBe('/directory');
    expect(items[2].href).toBe('/groups');
    expect(items[3].href).toBe('/services');
    expect(items[4].href).toBe('/resources');
    expect(items).toHaveLength(5);
  });

  it('returns custom header links when configured', () => {
    const items = getHeaderItems({
      ...defaultFlags,
      headerLinks: ['campaign', 'conservation', 'news', 'surveys'],
    });
    expect(items[0].href).toBe('/');
    expect(items[1].href).toBe('/campaign');
    expect(items[2].href).toBe('/conservation');
    expect(items[3].href).toBe('/news');
    expect(items[4].href).toBe('/surveys');
  });

  it('excludes items when flag is false', () => {
    const items = getHeaderItems({ ...defaultFlags, directory: false, services: false });
    // Home + Resources + Conservation = 3
    expect(items).toHaveLength(3);
    expect(items.some(i => i.href === '/directory')).toBe(false);
    expect(items.some(i => i.href === '/services')).toBe(false);
  });

  it('never exceeds 5 items', () => {
    const items = getHeaderItems(defaultFlags);
    expect(items.length).toBeLessThanOrEqual(5);
  });

  it('hides conservation when mode is external', () => {
    const items = getHeaderItems({ ...defaultFlags, conservation: 'external' });
    // Conservation hidden, no campaign substitute (focus=conservation)
    expect(items.some(i => i.href === '/conservation')).toBe(false);
  });

  it('shows campaign in header when focus is campaign even if conservation is external', () => {
    const items = getHeaderItems({
      ...defaultFlags,
      conservation: 'external',
      headerLinks: ['campaign', 'directory', 'groups', 'services'],
    });
    expect(items.some(i => i.href === '/campaign')).toBe(true);
    expect(items.some(i => i.href === '/conservation')).toBe(false);
  });
});

describe('getMoreDropdownItems', () => {
  it('includes Campaign when Conservation is in header', () => {
    const items = getMoreDropdownItems(defaultFlags);
    expect(items.some(i => i.href === '/campaign')).toBe(true);
    expect(items.some(i => i.href === '/conservation')).toBe(false);
  });

  it('includes Conservation when Campaign is in header', () => {
    const items = getMoreDropdownItems({
      ...defaultFlags,
      headerLinks: ['campaign', 'directory', 'groups', 'services'],
    });
    expect(items.some(i => i.href === '/conservation')).toBe(true);
    expect(items.some(i => i.href === '/campaign')).toBe(false);
  });

  it('filters out items with false flags', () => {
    const items = getMoreDropdownItems({ ...defaultFlags, news: false, surveys: false });
    expect(items.some(i => i.href === '/news')).toBe(false);
    expect(items.some(i => i.href === '/surveys')).toBe(false);
  });

  it('hides conservation in More dropdown when mode is external', () => {
    const items = getMoreDropdownItems({
      ...defaultFlags,
      conservation: 'external',
      headerLinks: ['campaign', 'directory', 'groups', 'services'],
    });
    // Conservation is external, so it should NOT appear in More dropdown
    expect(items.some(i => i.href === '/conservation')).toBe(false);
  });
});

describe('getWorkspaceItems', () => {
  it('returns 6 items for authenticated user with all flags enabled', () => {
    const items = getWorkspaceItems(defaultFlags, true);
    expect(items).toHaveLength(6);
  });

  it('returns empty for unauthenticated user', () => {
    const items = getWorkspaceItems(defaultFlags, false);
    expect(items).toHaveLength(0);
  });

  it('filters out flagged items but keeps no-flag items (notifications, settings)', () => {
    const items = getWorkspaceItems({ ...defaultFlags, bookings: false, messages: false }, true);
    // Dashboard + Maintenance + Notifications + Settings = 4 (bookings and messages filtered)
    expect(items).toHaveLength(4);
  });

  it('filters out dashboard when flag is false', () => {
    const items = getWorkspaceItems({ ...defaultFlags, dashboard: false }, true);
    expect(items.some(i => i.href === '/dashboard')).toBe(false);
    // Messages + Bookings + Maintenance + Notifications + Settings = 5
    expect(items).toHaveLength(5);
  });

  it('always includes notifications and settings for authenticated users (no flagKey)', () => {
    const items = getWorkspaceItems(
      { ...defaultFlags, dashboard: false, bookings: false, messages: false, maintenance: false },
      true
    );
    expect(items.some(i => i.href === '/notifications')).toBe(true);
    expect(items.some(i => i.href === '/settings')).toBe(true);
    expect(items).toHaveLength(2); // Only notifications + settings survive
  });

  it('notifications and settings are always last in workspace list', () => {
    const items = getWorkspaceItems(defaultFlags, true);
    expect(items[items.length - 2].href).toBe('/notifications');
    expect(items[items.length - 1].href).toBe('/settings');
  });
});

describe('getAdminItems', () => {
  it('returns all admin items for ADMIN role', () => {
    const items = getAdminItems('ADMIN');
    expect(items.length).toBeGreaterThan(5);
  });

  it('returns no admin items for RESIDENT role', () => {
    const items = getAdminItems('RESIDENT');
    expect(items).toHaveLength(0);
  });

  it('returns subset for BOARD role', () => {
    const items = getAdminItems('BOARD');
    // BOARD has requests, content, groups, settings — but not admin or users
    expect(items.some(i => i.href === '/admin/requests')).toBe(true);
    expect(items.some(i => i.href === '/admin/users')).toBe(false);
  });

  it('returns no items for null role', () => {
    const items = getAdminItems(null);
    expect(items).toHaveLength(0);
  });

  it('returns no items for undefined role', () => {
    const items = getAdminItems(undefined);
    expect(items).toHaveLength(0);
  });
});

describe('getBurgerSections', () => {
  it('returns 4 sections', () => {
    const sections = getBurgerSections(defaultFlags, true, 'ADMIN');
    expect(sections).toHaveProperty('explore');
    expect(sections).toHaveProperty('community');
    expect(sections).toHaveProperty('workspace');
    expect(sections).toHaveProperty('admin');
  });

  it('workspace section is empty for unauthenticated', () => {
    const sections = getBurgerSections(defaultFlags, false, null);
    expect(sections.workspace).toHaveLength(0);
  });

  it('admin section is empty for non-admin roles', () => {
    const sections = getBurgerSections(defaultFlags, true, 'RESIDENT');
    expect(sections.admin).toHaveLength(0);
  });

  it('all sections populated for ADMIN user', () => {
    const sections = getBurgerSections(defaultFlags, true, 'ADMIN');
    expect(sections.explore.length).toBeGreaterThan(0);
    expect(sections.community.length).toBeGreaterThan(0);
    expect(sections.workspace.length).toBeGreaterThan(0);
    expect(sections.admin.length).toBeGreaterThan(0);
  });

  it('explore section matches header items', () => {
    const headerItems = getHeaderItems(defaultFlags);
    const sections = getBurgerSections(defaultFlags, true, 'ADMIN');
    expect(sections.explore).toEqual(headerItems);
  });

  it('community section matches More dropdown items', () => {
    const moreItems = getMoreDropdownItems(defaultFlags);
    const sections = getBurgerSections(defaultFlags, true, 'ADMIN');
    expect(sections.community).toEqual(moreItems);
  });

  it('workspace section includes notifications and settings', () => {
    const sections = getBurgerSections(defaultFlags, true, 'RESIDENT');
    expect(sections.workspace.some(i => i.href === '/notifications')).toBe(true);
    expect(sections.workspace.some(i => i.href === '/settings')).toBe(true);
  });
});

describe('NavItem icons', () => {
  it('all header items have an icon property', () => {
    const items = getHeaderItems(defaultFlags);
    expect(items.every(i => typeof i.icon === 'string' && i.icon.length > 0)).toBe(true);
  });

  it('all More dropdown items have an icon property', () => {
    const items = getMoreDropdownItems(defaultFlags);
    expect(items.every(i => typeof i.icon === 'string' && i.icon.length > 0)).toBe(true);
  });

  it('all workspace items have an icon property', () => {
    const items = getWorkspaceItems(defaultFlags, true);
    expect(items.every(i => typeof i.icon === 'string' && i.icon.length > 0)).toBe(true);
  });

  it('all admin items have an icon property', () => {
    const items = getAdminItems('ADMIN');
    expect(items.every(i => typeof i.icon === 'string' && i.icon.length > 0)).toBe(true);
  });
});
