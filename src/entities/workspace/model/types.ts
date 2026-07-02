/**
 * Workspace types — domain vocabulary for the WorkspaceContext architecture.
 *
 * This is the canonical source of workspace-type vocabulary. All workspace-aware
 * UI consumes this registry (C-05) rather than branching on Role (C-04).
 *
 * Design decisions:
 *   - icon fields are STRING keys (e.g. 'User'), not LucideIcon components.
 *     This keeps the entities slice free of UI dependencies (RESEARCH §10.1,
 *     Pattern A Steiger caveat). Widget code resolves strings → icon components.
 *   - Interfaces preferred over types per AGENTS.md conventions.
 */

import type { Permission } from './permissions';

// ── Workspace Type ──────────────────────────────────────────────────

/** The five workspace types registered in WORKSPACE_REGISTRY (C-05). */
export type WorkspaceType =
  | 'PERSONAL'
  | 'PROVIDER'
  | 'PROPERTY'
  | 'OWNER'
  | 'AUTOMATION';

// ── Navigation & Actions ───────────────────────────────────────────

/** A single navigation entry within a workspace definition. */
export interface NavItem {
  /** Display label (human-readable, English for v1). */
  label: string;
  /** Route href. */
  href: string;
  /** String icon key resolved by widget code (e.g. 'Home'). */
  icon?: string;
}

/** A contextual action available within a workspace (D-14). */
export interface ActionDef {
  /** Unique action key (e.g. 'create_maintenance'). */
  key: string;
  /** Display label (human-readable, English for v1). */
  label: string;
  /** String icon key (e.g. 'Wrench'). */
  icon?: string;
  /** Destructive actions show a confirmation dialog. */
  destructive?: boolean;
  /** Optional direct route for the action. */
  href?: string;
}

// ── Workspace Definition ───────────────────────────────────────────

/**
 * A single entry in the WORKSPACE_REGISTRY static record.
 *
 * Pattern A (RESEARCH §1.3): static Record<K, V> + pure helpers —
 * no runtime `register()` mutation API.
 */
export interface WorkspaceDefinition {
  /** The workspace type key. */
  type: WorkspaceType;
  /** Human-readable label. */
  label: string;
  /** String icon key (e.g. 'User', 'Building2', 'Home'). */
  icon: string;
  /** Optional resource route (Personal has no dedicated route). */
  href?: string;
  /** Navigation entries for this workspace type. */
  navigation: NavItem[];
  /** Contextual actions available in this workspace (D-14). */
  actions: ActionDef[];
  /** Widget keys that belong to this workspace. Populated in later P2 phases. */
  widgetIds: string[];
  /** Permissions required to access this workspace type. */
  requiredPermissions: Permission[];
  /** Hierarchical children workspace types (D-04). */
  children?: WorkspaceType[];
  /** When true, excluded from getEnabledDefinitions() (D-11). */
  disabled?: boolean;
}

// ── Runtime Context ─────────────────────────────────────────────────

/**
 * The active workspace lens — replaces role-based branching (C-04).
 *
 * C-03: lightweight — only scope pointer + permissions. No domain data.
 * C-01: immutable — atomically replaced on switch, never mutated in place.
 */
export interface WorkspaceContext {
  /** Unique workspace identifier. */
  workspaceId: string;
  /** The workspace type currently active. */
  workspaceType: WorkspaceType;
  /** Optional scope reference (property/provider/owner IDs). */
  scope?: {
    propertyId?: string;
    providerId?: string;
    ownerId?: string;
  };
  /** Permissions active for this workspace context. */
  permissions: Permission[];
}

// ── Switch Target ───────────────────────────────────────────────────

/**
 * Describes the target workspace for a switch operation.
 *
 * Used by switchWorkspace() to resolve the next WorkspaceContext.
 */
export interface WorkspaceTarget {
  /** The type of workspace to switch into. */
  workspaceType: WorkspaceType;
  /** Delegation ID (required for PROPERTY workspace resolution). */
  delegationId?: string;
  /** Property ID hint (for deep-link inference). */
  propertyId?: string;
  /** Provider ID hint (for PROVIDER workspace resolution, deferred to P2). */
  providerId?: string;
  /** Owner ID hint (for OWNER workspace resolution, deferred to P2). */
  ownerId?: string;
}
