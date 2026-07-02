/**
 * OwnerScopePanel — renders the OWNER workspace scope panel fields.
 *
 * Scaffolded for P1a — runtime path activates in P2 when OWNER resolver lands
 * (D-03: resolveWorkspaceContext('OWNER') throws not_implemented in P1a).
 * Test coverage via mocked WorkspaceContext.
 *
 * Internal sub-component of WorkspaceScopePanel (Pattern L / D-13).
 * NOT exported from the widgets/workspace barrel.
 */

'use client';

import { permissionsText } from './scope-panel-helpers';

interface OwnerScopePanelProps {
  perms: string[];
}

export function OwnerScopePanel({ perms }: OwnerScopePanelProps) {
  return (
    <>
      <p className="text-xs text-gray-500 mt-2">Permissions: {permissionsText(perms)}</p>
      <p className="text-xs text-gray-500">Expires: Never</p>
    </>
  );
}
