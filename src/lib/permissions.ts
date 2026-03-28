import { ROLES } from './constants';

export type Role = keyof typeof ROLES;

export interface Permission {
  admin: boolean;
  users: boolean;
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
}

export const ROLE_PERMISSIONS: Record<Role, Permission> = {
  RESIDENT: {
    admin: false,
    users: false,
    requests: false,
    content: false,
    groups: false,
    groupsOwn: false,
    contentOwn: false,
    events: true,
    bookings: true,
    directory: true,
    messages: true,
    settings: false,
  },
  GROUP_ADMIN: {
    admin: false,
    users: false,
    requests: false,
    content: false,
    groups: true,
    groupsOwn: true,
    contentOwn: true,
    events: true,
    bookings: true,
    directory: true,
    messages: true,
    settings: false,
  },
  COMMITTEE: {
    admin: false,
    users: false,
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
  },
  BOARD: {
    admin: false,
    users: false,
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
  },
  ADMIN: {
    admin: true,
    users: true,
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
  },
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

export function getPermissions(role: string | null | undefined): Permission {
  if (!role) return ROLE_PERMISSIONS.RESIDENT;
  return ROLE_PERMISSIONS[role as Role] || ROLE_PERMISSIONS.RESIDENT;
}
