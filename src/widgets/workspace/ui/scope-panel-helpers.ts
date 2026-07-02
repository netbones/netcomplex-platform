/**
 * Scope panel pure helpers — shared across sub-panels.
 *
 * These functions are NOT 'use client' (no React dependency) and are
 * imported by the sub-panel components. Extracted here to keep the
 * main WorkspaceScopePanel under the 200-line AGENTS.md cap.
 */

import { SCOPE_LABELS } from '@entities/delegation';
import type { WorkspaceContext } from '@entities/workspace';
import type { DelegationListItem } from '@entities/delegation';

/** Human-readable label for an expiry date — "Never" when null. */
export function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return 'Never';
  return new Date(expiresAt).toLocaleDateString();
}

/** Permissions chip text from workspace context, SCOPE_LABELS-mapped. */
export function permissionsText(perms: string[]): string {
  if (perms.length === 0) return '—No permissions—';
  return perms.map(p => SCOPE_LABELS[p] ?? p).join(', ');
}

/** Build fieldsMissing array — field-name strings only, NEVER PII (T-122-09). */
export function buildFieldsMissing(
  wctx: WorkspaceContext,
  delegation: DelegationListItem[] | undefined
): string[] {
  const missing: string[] = [];
  if (wctx.workspaceType === 'PROPERTY' && !delegation?.[0]?.propertyAddress) {
    missing.push('name');
  }
  if (wctx.workspaceType === 'PERSONAL' && !wctx.workspaceId) {
    missing.push('name');
  }
  if (!wctx.scope && wctx.workspaceType !== 'PERSONAL') {
    missing.push('scope');
  }
  return missing;
}
