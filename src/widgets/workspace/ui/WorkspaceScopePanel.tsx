/**
 * WorkspaceScopePanel — first-class workspace object (WS-06, D-13)
 *
 * Replaces the plan 122-03 stub. The SINGLE identity surface (C-02):
 * URLs are resource-only; this panel shows scope, delegator, permissions,
 * and expiry so the user always knows what they operate on.
 *
 * Parametrized across PERSONAL / PROVIDER / PROPERTY / OWNER via
 * discriminator-conditional sub-panels (Pattern L). AUTOMATION never renders
 * (D-11). Sub-panels extracted to keep this file under 200 lines (AGENTS.md).
 *
 * Observability: emits `workspace.scope.rendered` debug event with
 * workspaceId, workspaceType, and fieldsMissing[] — NEVER permissions[] values
 * or delegator PII (T-122-09).
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useWorkspaceContext } from '@features/workspace';
import { WORKSPACE_REGISTRY } from '@entities/workspace';
import { useDelegations } from '@entities/delegation';
import { useSession } from '@api/client';
import { logger } from '@shared/lib';
import { LoadingSkeleton } from '@shared/ui';
import { PersonalScopePanel } from './PersonalScopePanel';
import { ProviderScopePanel } from './ProviderScopePanel';
import { PropertyScopePanel } from './PropertyScopePanel';
import { OwnerScopePanel } from './OwnerScopePanel';
import { buildFieldsMissing } from './scope-panel-helpers';

/**
 * WorkspaceScopePanel — the panel that makes the workspace itself visible.
 *
 * Renders in the app shell as a persistent element (UI-SPEC §'Surface 3').
 * Consumes only {@link WorkspaceContext} fields + RLS-gated delegation data
 * (C-03 lightweight — no domain data widgets).
 */
export function WorkspaceScopePanel() {
  const wctx = useWorkspaceContext();
  const { data: sessionData } = useSession();

  // ══ Resolving / loading ══
  if (!wctx) return <LoadingSkeleton />;

  // ══ D-11: AUTOMATION never renders ══
  if (wctx.workspaceType === 'AUTOMATION') return null;

  const def = WORKSPACE_REGISTRY[wctx.workspaceType];

  // ══ Resolve delegation data for Property/Provider scope ══
  const propDelegations =
    wctx.workspaceType === 'PROPERTY' && wctx.scope?.propertyId
      ? useDelegations({ propertyId: wctx.scope.propertyId, status: 'ACTIVE' })
      : { data: undefined, isLoading: false };
  const delData = 'data' in propDelegations ? propDelegations.data : undefined;

  // ══ Resolve display name per type ══
  const displayName = useMemo(() => {
    if (wctx.workspaceType === 'PERSONAL') {
      return sessionData?.user?.name ?? 'Unnamed workspace';
    }
    if (wctx.workspaceType === 'PROPERTY') {
      return delData?.[0]?.propertyAddress ?? 'Unnamed workspace';
    }
    // PROVIDER/OWNER — scaffold in P1a (D-03: resolver throws not_implemented)
    return 'Unnamed workspace';
  }, [wctx.workspaceType, sessionData?.user?.name, delData]);

  // ══ fieldsMissing — computed for Pino observability (NEVER PII) ══
  const fieldsMissing = useMemo(() => buildFieldsMissing(wctx, delData), [wctx, delData]);

  // ══ Pino debug event — PII guard (T-122-09) ══
  useEffect(() => {
    logger.debug(
      { workspaceId: wctx.workspaceId, workspaceType: wctx.workspaceType, fieldsMissing },
      'workspace.scope.rendered'
    );
  }, [wctx.workspaceId, wctx.workspaceType, fieldsMissing]);

  // ══ Warn on missing fields ══
  useEffect(() => {
    if (displayName === 'Unnamed workspace') {
      logger.warn(
        { workspaceId: wctx.workspaceId, reason: 'name_unresolved' },
        'WorkspaceScopePanel: name unresolved'
      );
    }
    if (wctx.permissions.length === 0) {
      logger.warn(
        { workspaceId: wctx.workspaceId, reason: 'permissions_empty' },
        'WorkspaceScopePanel: permissions empty'
      );
    }
  }, [displayName, wctx.permissions.length, wctx.workspaceId]);

  // ══ Render ══
  return (
    <aside className="bg-white rounded-lg p-6">
      {/* Priority 1: Workspace identity (UI-SPEC Surface 3) */}
      <h2 className="text-2xl font-bold">Current Workspace</h2>
      <p className="text-sm text-gray-900">{def?.label ?? wctx.workspaceType}</p>
      <p className="text-sm text-gray-600">{displayName}</p>

      {/* Discriminator-conditional sub-panels (Pattern L, C-04 — no Role branching) */}
      {wctx.workspaceType === 'PERSONAL' && <PersonalScopePanel perms={wctx.permissions} />}
      {wctx.workspaceType === 'PROVIDER' && <ProviderScopePanel perms={wctx.permissions} />}
      {wctx.workspaceType === 'PROPERTY' && (
        <PropertyScopePanel perms={wctx.permissions} delegation={delData} />
      )}
      {wctx.workspaceType === 'OWNER' && <OwnerScopePanel perms={wctx.permissions} />}
      {/* AUTOMATION returned null above (D-11) */}
    </aside>
  );
}
