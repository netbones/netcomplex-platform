import type { Role } from './constants';

export interface Permission {
  admin: boolean;
  users: boolean;
  manageRoster: boolean;
  manageBilling: boolean;
  households: boolean;
  requests: boolean;
  content: boolean;
  groups: boolean;
  groupsOwn: boolean;
  contentOwn: boolean;
  events: boolean;
  bookings: boolean;
  directory: boolean;
  messages: boolean;
  settings: boolean;
  announcements: boolean;
  providers: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, Permission> = {
  RESIDENT: {
    admin: false,
    manageRoster: false,
    manageBilling: false,
    users: false,
    households: false,
    requests: false,
    content: false,
    contentOwn: true,
    groups: false,
    groupsOwn: false,
    events: true,
    bookings: true,
    directory: true,
    messages: true,
    settings: false,
    announcements: false,
    providers: false,
  },
  GROUP_ADMIN: {
    admin: false,
    manageRoster: false,
    manageBilling: false,
    users: false,
    households: false,
    requests: false,
    content: false,
    groups: false,
    groupsOwn: true,
    contentOwn: true,
    events: true,
    bookings: true,
    directory: true,
    messages: true,
    settings: false,
    announcements: false,
    providers: false,
  },
  COMMITTEE: {
    admin: false,
    manageRoster: false,
    manageBilling: false,
    users: false,
    households: false,
    requests: true,
    content: true,
    groups: true,
    groupsOwn: true,
    contentOwn: true,
    events: true,
    bookings: true,
    directory: true,
    messages: true,
    settings: true,
    announcements: true,
    providers: false,
  },
  BOARD: {
    admin: false,
    manageRoster: false,
    manageBilling: false,
    users: false,
    households: true,
    requests: true,
    content: true,
    groups: true,
    groupsOwn: true,
    contentOwn: true,
    events: true,
    bookings: true,
    directory: true,
    messages: true,
    settings: true,
    announcements: true,
    providers: true,
  },
  ADMIN: {
    admin: true,
    manageRoster: true,
    manageBilling: true,
    users: true,
    households: true,
    requests: true,
    content: true,
    groups: true,
    groupsOwn: true,
    contentOwn: true,
    events: true,
    bookings: true,
    directory: true,
    messages: true,
    settings: true,
    announcements: true,
    providers: true,
  },
  AGENT: {
    admin: false,
    manageRoster: false,
    manageBilling: false,
    users: false,
    households: false,
    requests: false,
    content: false,
    groups: false,
    groupsOwn: false,
    contentOwn: false,
    events: false,
    bookings: false,
    directory: false,
    messages: false,
    settings: false,
    announcements: false,
    providers: false,
  },
  MANAGER: {
    admin: false,
    manageRoster: true,
    manageBilling: false,
    users: true,
    households: true,
    requests: true,
    content: true,
    groups: true,
    groupsOwn: true,
    contentOwn: true,
    events: true,
    bookings: true,
    directory: true,
    messages: true,
    settings: true,
    announcements: true,
    providers: false,
  },
  ASSOCIATE: {
    admin: false,
    manageRoster: false,
    manageBilling: false,
    users: false,
    households: false,
    requests: false,
    content: false,
    groups: false,
    groupsOwn: true,
    contentOwn: true,
    events: true,
    bookings: true,
    directory: true,
    messages: true,
    settings: false,
    announcements: false,
    providers: false,
  },
  PROVIDER: {
    admin: false,
    manageRoster: false,
    manageBilling: false,
    users: false,
    households: false,
    requests: false,
    content: false,
    groups: false,
    groupsOwn: false,
    contentOwn: true,
    events: false,
    bookings: false,
    directory: false,
    messages: true,
    settings: false,
    announcements: false,
    providers: true,
  },
};

const ZERO_PERMISSIONS: Permission = {
  admin: false,
  manageRoster: false,
  manageBilling: false,
  users: false,
  households: false,
  requests: false,
  content: false,
  groups: false,
  groupsOwn: false,
  contentOwn: false,
  events: false,
  bookings: false,
  directory: false,
  messages: false,
  settings: false,
  announcements: false,
  providers: false,
};

export function hasPermission(
  role: string | null | undefined,
  permission: keyof Permission
): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as Role];
  return perms ? perms[permission] : false;
}

export function isAdmin(role: string | null | undefined): boolean {
  return hasPermission(role, 'admin');
}

export function canManageUsers(role: string | null | undefined): boolean {
  return hasPermission(role, 'users');
}

export function canManageRoster(role: string | null | undefined): boolean {
  return hasPermission(role, 'manageRoster');
}

export function canManageBilling(role: string | null | undefined): boolean {
  return hasPermission(role, 'manageBilling');
}

export function canManageRequests(role: string | null | undefined): boolean {
  return hasPermission(role, 'requests');
}

export function canManageContent(role: string | null | undefined): boolean {
  return hasPermission(role, 'content');
}

export function canManageGroups(role: string | null | undefined): boolean {
  return hasPermission(role, 'groups');
}

export function canManageOwnGroupOnly(role: string | null | undefined): boolean {
  return hasPermission(role, 'groupsOwn');
}

export function canManageEvents(role: string | null | undefined): boolean {
  return hasPermission(role, 'events');
}

export function canManageBookings(role: string | null | undefined): boolean {
  return hasPermission(role, 'bookings');
}

export function canAccessDirectory(role: string | null | undefined): boolean {
  return hasPermission(role, 'directory');
}

export function canManageSettings(role: string | null | undefined): boolean {
  return hasPermission(role, 'settings');
}

export function canAccessHouseholds(role: string | null | undefined): boolean {
  return hasPermission(role, 'households');
}

export function getPermissions(role: string | null | undefined): Permission {
  if (!role) return ZERO_PERMISSIONS;
  return ROLE_PERMISSIONS[role as Role] ?? ZERO_PERMISSIONS;
}

export function canPublishAnnouncements(role: string | null | undefined): boolean {
  return hasPermission(role, 'announcements');
}

export function requireRole(
  role: string | null | undefined,
  permissions: Array<keyof Permission>
): { allowed: boolean; role: string | null } {
  if (!role) return { allowed: false, role: null };
  const allowed = permissions.some(p => hasPermission(role, p));
  return { allowed, role };
}
