/**
 * inferWorkspaceTarget — Pure URL → WorkspaceTarget Parser (D-07)
 *
 * NOT 'use client' — pure function, no React, no hooks.
 *
 * C-02: only PARSES resource paths — never encodes workspace state into URLs.
 * The returned WorkspaceTarget is used by the caller (NotificationLink /
 * switchWorkspace) to resolve the actual workspace context against RLS-gated
 * delegations.
 *
 * Threat T-122-08: inferWorkspaceTarget grants NOTHING — authorization
 * happens in resolveWorkspaceContext against RLS-gated delegations.
 */

import type { WorkspaceTarget } from '@entities/workspace';

const PROPERTY_PATH_RE = /^\/properties\/([a-zA-Z0-9_-]+)/;
const PROVIDER_PATH_RE = /^\/provider(?:\/|$)/;
const OWNER_PATH_RE = /^\/owner(?:\/|$)/;
const DASHBOARD_ROOT_RE = /^\/(dashboard|admin)?\/?$/;

/**
 * Parse a notification link URL into a WorkspaceTarget.
 *
 * C-02: reads resource-only URLs. Returns `null` for unrecognized
 * links — the caller falls through to plain `<Link>` navigation.
 *
 * @param link — the raw notification.link URL string
 * @returns WorkspaceTarget or null for unrecognized paths
 */
export function inferWorkspaceTarget(link: string): WorkspaceTarget | null {
  // Strip any leading/trailing whitespace
  const trimmed = link.trim();

  // ── Properties ───────────────────────────────────────────
  const propertyMatch = trimmed.match(PROPERTY_PATH_RE);
  if (propertyMatch) {
    return {
      workspaceType: 'PROPERTY',
      propertyId: propertyMatch[1],
      // delegationId is resolved later by switchWorkspace via useDelegations
    };
  }

  // ── Provider ─────────────────────────────────────────────
  if (PROVIDER_PATH_RE.test(trimmed)) {
    return { workspaceType: 'PROVIDER' };
  }

  // ── Owner ────────────────────────────────────────────────
  if (OWNER_PATH_RE.test(trimmed)) {
    return { workspaceType: 'OWNER' };
  }

  // ── Dashboard / root → PERSONAL ──────────────────────────
  if (DASHBOARD_ROOT_RE.test(trimmed)) {
    return { workspaceType: 'PERSONAL' };
  }

  // ── Unrecognized → null (caller falls through to plain Link) ─
  return null;
}
