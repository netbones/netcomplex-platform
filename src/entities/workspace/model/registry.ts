/**
 * Workspace Registry — Canonical source of truth for workspace types,
 * navigation, actions, widgets, and permission mapping (WS-01 / C-05).
 *
 * Pattern A (RESEARCH §1.3): static Record<K, V> + pure helpers.
 * No runtime `register()` mutation API — new workspace types only
 * require a new registry entry, no shell changes.
 *
 * Design:
 *   - String icon keys (e.g. 'User') — entities slice stays free of
 *     UI dependencies (RESEARCH §10.1). Widget code resolves strings.
 *   - AUTOMATION.disabled = true (D-11) — one-line flip later.
 *   - PROVIDER.children = ['PROPERTY'] (D-04 hierarchy).
 *   - widgetIds declared on every definition, populated in later P2 phases.
 */

import type { WorkspaceType, WorkspaceDefinition, NavItem, ActionDef } from './types';
import type { Permission } from './permissions';

// ═══════════════════════════════════════════════════════════════
// WORKSPACE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const PERSONAL_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Profile', href: '/profile', icon: 'UserCircle' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
];

const PROVIDER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/provider/dashboard', icon: 'LayoutDashboard' },
  { label: 'Marketplace', href: '/provider/marketplace', icon: 'Store' },
  { label: 'Bookings', href: '/provider/bookings', icon: 'CalendarCheck' },
  { label: 'Staff', href: '/provider/staff', icon: 'Users' },
];

const PROPERTY_NAV: NavItem[] = [
  { label: 'Overview', href: '/properties/[id]', icon: 'Home' },
  { label: 'Maintenance', href: '/properties/[id]/maintenance', icon: 'Wrench' },
  { label: 'Documents', href: '/properties/[id]/documents', icon: 'FileText' },
];

const OWNER_NAV: NavItem[] = [
  { label: 'My Properties', href: '/owner/properties', icon: 'Building2' },
  { label: 'Delegations', href: '/owner/delegations', icon: 'UserCheck' },
  { label: 'Audit', href: '/owner/audit', icon: 'ScrollText' },
];

const PERSONAL_ACTIONS: ActionDef[] = [
  { key: 'profile', label: 'Profile', icon: 'UserCircle', href: '/profile' },
  { key: 'settings', label: 'Settings', icon: 'Settings', href: '/settings' },
];

const PROVIDER_ACTIONS: ActionDef[] = [
  {
    key: 'marketplace',
    label: 'Marketplace',
    icon: 'Store',
    href: '/provider/marketplace',
  },
  {
    key: 'bookings',
    label: 'Bookings',
    icon: 'CalendarCheck',
    href: '/provider/bookings',
  },
  {
    key: 'staff',
    label: 'Staff',
    icon: 'Users',
    href: '/provider/staff',
  },
];

const PROPERTY_ACTIONS: ActionDef[] = [
  {
    key: 'create_maintenance',
    label: 'Create Maintenance',
    icon: 'Wrench',
    href: '/maintenance/new',
  },
  {
    key: 'message_owner',
    label: 'Message Owner',
    icon: 'MessageSquare',
    href: '/messages/new',
  },
  {
    key: 'upload_document',
    label: 'Upload Document',
    icon: 'Upload',
    href: '/documents/upload',
  },
];

const OWNER_ACTIONS: ActionDef[] = [
  {
    key: 'create_delegation',
    label: 'Create Delegation',
    icon: 'UserPlus',
    href: '/owner/delegations/new',
  },
  {
    key: 'review_audit',
    label: 'Review Audit',
    icon: 'ScrollText',
    href: '/owner/audit',
  },
  {
    key: 'suspend_access',
    label: 'Suspend Access',
    icon: 'ShieldOff',
    destructive: true,
    href: '/owner/suspend',
  },
];

const PERSONAL_PERMISSIONS: Permission[] = ['profile:read', 'settings:manage'] as Permission[];

const PROVIDER_PERMISSIONS: Permission[] = [
  'maintenance:coordinate',
  'maintenance:manage',
  'communication:contact_occupant',
  'documents:read',
  'documents:upload',
] as Permission[];

const PROPERTY_PERMISSIONS: Permission[] = [
  'maintenance:read',
  'maintenance:create',
  'communication:contact_occupant',
  'documents:read',
  'documents:upload',
] as Permission[];

const OWNER_PERMISSIONS: Permission[] = [
  'maintenance:approve',
  'tenancy:manage',
  'financials:read',
  'listing:manage',
  'inspection:schedule',
] as Permission[];

// ═══════════════════════════════════════════════════════════════
// REGISTRY
// ═══════════════════════════════════════════════════════════════

/**
 * Canonical static registry of all workspace types (C-05 / WS-01).
 *
 * Pattern A: static Record + pure helpers. No runtime register() API.
 * Adding a new workspace type = adding a new entry here — the shell
 * remains unchanged (C-05 rationale).
 */
export const WORKSPACE_REGISTRY: Record<WorkspaceType, WorkspaceDefinition> = {
  PERSONAL: {
    type: 'PERSONAL',
    label: 'Personal',
    icon: 'User',
    // Personal workspace has no dedicated resource route
    navigation: PERSONAL_NAV,
    actions: PERSONAL_ACTIONS,
    widgetIds: [],
    requiredPermissions: PERSONAL_PERMISSIONS,
  },
  PROVIDER: {
    type: 'PROVIDER',
    label: 'Provider',
    icon: 'Building2',
    href: '/provider/dashboard',
    navigation: PROVIDER_NAV,
    actions: PROVIDER_ACTIONS,
    widgetIds: [],
    requiredPermissions: PROVIDER_PERMISSIONS,
    // D-04: Delegated Properties nest under the Provider workspace
    children: ['PROPERTY'],
  },
  PROPERTY: {
    type: 'PROPERTY',
    label: 'Property',
    icon: 'Home',
    // D-06: single property route with role-conditional UI sections
    href: '/properties/[id]',
    navigation: PROPERTY_NAV,
    actions: PROPERTY_ACTIONS,
    widgetIds: [],
    requiredPermissions: PROPERTY_PERMISSIONS,
  },
  OWNER: {
    type: 'OWNER',
    label: 'Owner',
    icon: 'ShieldCheck',
    href: '/owner',
    navigation: OWNER_NAV,
    actions: OWNER_ACTIONS,
    widgetIds: [],
    requiredPermissions: OWNER_PERMISSIONS,
  },
  AUTOMATION: {
    type: 'AUTOMATION',
    label: 'Automation',
    icon: 'Bot',
    navigation: [],
    actions: [],
    widgetIds: [],
    requiredPermissions: [],
    // D-11: hidden until Phase 113+ — one-line flip to enable
    disabled: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// PURE HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Returns all workspace definitions where `disabled` is not `true`.
 *
 * Pattern: mirrors `filterSpaces()` and `getEnabledFeaturesForTenant()`.
 * AUTOMATION (disabled:true) is excluded — satisfies D-11.
 */
export function getEnabledDefinitions(): WorkspaceDefinition[] {
  return Object.values(WORKSPACE_REGISTRY).filter(d => !d.disabled);
}

/**
 * Looks up a workspace definition by its type key.
 *
 * Returns `undefined` for unrecognized types (mirrors `resolveSpace()`).
 */
export function getDefinition(type: WorkspaceType): WorkspaceDefinition | undefined {
  return WORKSPACE_REGISTRY[type];
}

/**
 * Returns all registered WorkspaceType keys.
 */
export function getWorkspaceTypes(): WorkspaceType[] {
  return Object.keys(WORKSPACE_REGISTRY) as WorkspaceType[];
}
