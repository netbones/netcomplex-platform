/**
 * PropertyScopePanel — renders the PROPERTY workspace scope panel fields.
 *
 * Renders delegator name + expiry from RLS-gated useDelegations data.
 * Internal sub-component of WorkspaceScopePanel (Pattern L / D-13).
 * NOT exported from the widgets/workspace barrel.
 */

'use client';

import { permissionsText, expiryLabel } from './scope-panel-helpers';
import type { DelegationListItem } from '@entities/delegation';

interface PropertyScopePanelProps {
  perms: string[];
  delegation: DelegationListItem[] | undefined;
}

export function PropertyScopePanel({ perms, delegation }: PropertyScopePanelProps) {
  const del = delegation?.[0];

  return (
    <>
      {del?.grantedByName && (
        <p className="text-xs text-gray-500 mt-2">Delegated by: {del.grantedByName}</p>
      )}
      <p className="text-xs text-gray-500">Expires: {expiryLabel(del?.expiresAt ?? null)}</p>
      <p className="text-xs text-gray-500">Permissions: {permissionsText(perms)}</p>
    </>
  );
}
