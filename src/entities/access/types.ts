/**
 * Access Control — Canonical Access Types
 *
 * Defines the types for the server-side access resolution pipeline.
 * This is the single source of truth for what any caller (user or agent)
 * can see: spaces, pages, features, and agent delegation.
 *
 * Phase 110-01: Entity layer for page navigation access control.
 */

import type { Role } from '@shared/lib';
import type { PlatformPageFlags } from '@shared/lib';
import type { SpaceId } from '@widgets/dashboard';

// ═══════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════

/** Caller identity for the access resolution request. */
export interface AccessInput {
  /**
   * Caller type.
   * - `'user'`: Human user authenticated via Better Auth session.
   * - `'agent'`: Automated agent with a bearer token (future extension point per D-08/D-09).
   * - Absent: Defaults to human user.
   */
  caller?: 'user' | 'agent';
  /**
   * Agent bearer token. Only relevant when caller === 'agent'.
   * Parsed but NOT validated in this phase — full agent gateway is deferred.
   */
  token?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Resolved server-side context passed into the access resolution pipeline.
 *
 * All fields are pre-resolved by the route handler from the session, DB lookups,
 * and feature flag system. The resolver itself is a pure synchronous function —
 * it takes this context and returns structured page access.
 *
 * Field provenance:
 * - `tenantId`: from `withTenant()` middleware (session-scoped tenant)
 * - `userId`: from Better Auth session (`session.user.id`)
 * - `userEmail`: from Better Auth session (`session.user.email`), null-safe
 * - `role`: from Better Auth session + `users` table (`session.user.role`)
 * - `providerRecordExists`: DB-backed lookup via `getProviderRecordForUser()`
 * - `isSuspended`: DB-backed lookup via `requireNotSuspended()`
 * - `flags`: DB-backed lookup via `getPlatformPageFlags()`
 */
export interface AccessContext {
  /** Tenant identifier resolved by withTenant() middleware. */
  tenantId: string;
  /** Authenticated user ID from Better Auth session. */
  userId: string;
  /** Authenticated user email from Better Auth session. Null-safe. */
  userEmail: string | null;
  /** Effective role from session + users table lookup. */
  role: Role;
  /** Whether the user has a linked provider record (DB-backed). */
  providerRecordExists: boolean;
  /** Whether the user is currently suspended (DB-backed). */
  isSuspended: boolean;
  /** Platform page feature flags for this tenant (DB-backed). */
  flags: PlatformPageFlags;
}

// ═══════════════════════════════════════════════════════════════
// RESOLUTION OUTPUT
// ═══════════════════════════════════════════════════════════════

/** Allowed space identifiers from the SPACES registry. */
export type SpaceAccess = SpaceId[];

/** Enabled feature/page keys. CamelCase keys matching page route slugs. */
export type FeatureAccess = string[];

/**
 * Structured access resolution returned by the 5-layer pipeline.
 *
 * This is the canonical response shape for GET /api/access and any
 * server-side access check. Clients use this to decide which nav items,
 * spaces, pages, and features to render.
 *
 * Field provenance:
 * - `spaces`: Layer 0 (role) + Layer 1 (provider record) + Layer 3 (flags), nulled by Layer 2 (suspension)
 * - `pages`: Layer 3 (feature flags) — camelCase keys matching page route slugs
 * - `features`: Layer 0 (role permissions) + Layer 3 (feature flags) — module names enabled
 * - `agent`: Layer 4 (agent token) — null for human callers, stub for agent callers
 * - `resolvedAt`: ISO 8601 timestamp set at invocation time for ETag/Last-Modified caching
 */
export interface AccessResolution {
  /** Allowed space IDs from the SPACES registry. Always present (empty array for unauthenticated). */
  spaces: SpaceId[];
  /** Enabled page keys (camelCase, matching page route slugs). */
  pages: string[];
  /** Enabled module/feature keys. */
  features: string[];
  /**
   * Agent delegation information.
   * - `null`: Human caller (default).
   * - `{ scope: [], expiresAt: null }`: Agent caller stub (full gateway deferred per D-09).
   */
  agent: { scope: string[]; expiresAt: string | null } | null;
  /** ISO 8601 timestamp of resolution — enables client ETag/Last-Modified caching. */
  resolvedAt: string;
}

/** @deprecated Use `AccessResolution` instead. Kept for backward-compat during transition. */
export type PageAccess = AccessResolution;
