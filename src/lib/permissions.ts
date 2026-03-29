import { ROLES } from './constants';

/** User role type derived from ROLES constants */
export type Role = keyof typeof ROLES;

/** Permission flags for role-based access control */
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

/** Role-to-permission mapping for the application */
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
    groups: false,
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

/**
 * Checks if the given role has the specified permission.
 * @param role - The user role to check
 * @param permission - The permission to verify
 * @returns True if the role has the permission, false otherwise
 */
export function hasPermission(
  role: string | null | undefined,
  permission: keyof Permission
): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as Role];
  return perms ? perms[permission] : false;
}

/**
 * Checks if the role has admin privileges.
 * @param role - The user role to check
 * @returns True if role is ADMIN
 */
export function isAdmin(role: string | null | undefined): boolean {
  return hasPermission(role, 'admin');
}

/**
 * Checks if the role can manage users.
 * @param role - The user role to check
 * @returns True if role has users permission
 */
export function canManageUsers(role: string | null | undefined): boolean {
  return hasPermission(role, 'users');
}

/**
 * Checks if the role can manage maintenance requests.
 * @param role - The user role to check
 * @returns True if role has requests permission
 */
export function canManageRequests(role: string | null | undefined): boolean {
  return hasPermission(role, 'requests');
}

/**
 * Checks if the role can manage content.
 * @param role - The user role to check
 * @returns True if role has content permission
 */
export function canManageContent(role: string | null | undefined): boolean {
  return hasPermission(role, 'content');
}

/**
 * Checks if the role can manage all groups.
 * @param role - The user role to check
 * @returns True if role has groups permission
 */
export function canManageGroups(role: string | null | undefined): boolean {
  return hasPermission(role, 'groups');
}

/**
 * Checks if the role can manage their own group only.
 * @param role - The user role to check
 * @returns True if role has groupsOwn permission
 */
export function canManageOwnGroupOnly(role: string | null | undefined): boolean {
  return hasPermission(role, 'groupsOwn');
}

/**
 * Checks if the role can manage events.
 * @param role - The user role to check
 * @returns True if role has events permission
 */
export function canManageEvents(role: string | null | undefined): boolean {
  return hasPermission(role, 'events');
}

/**
 * Checks if the role can manage bookings.
 * @param role - The user role to check
 * @returns True if role has bookings permission
 */
export function canManageBookings(role: string | null | undefined): boolean {
  return hasPermission(role, 'bookings');
}

/**
 * Checks if the role can access the directory.
 * @param role - The user role to check
 * @returns True if role has directory permission
 */
export function canAccessDirectory(role: string | null | undefined): boolean {
  return hasPermission(role, 'directory');
}

/**
 * Checks if the role can manage settings.
 * @param role - The user role to check
 * @returns True if role has settings permission
 */
export function canManageSettings(role: string | null | undefined): boolean {
  return hasPermission(role, 'settings');
}

/**
 * Gets the full permission object for a role.
 * @param role - The user role
 * @returns Permission object for the role, defaults to RESIDENT if role not found
 */
export function getPermissions(role: string | null | undefined): Permission {
  if (!role) return ROLE_PERMISSIONS.RESIDENT;
  return ROLE_PERMISSIONS[role as Role] || ROLE_PERMISSIONS.RESIDENT;
}
