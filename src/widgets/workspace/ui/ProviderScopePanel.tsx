/**
 * ProviderScopePanel — renders the PROVIDER workspace scope panel fields.
 *
 * Internal sub-component of WorkspaceScopePanel (Pattern L / D-13).
 * NOT exported from the widgets/workspace barrel.
 */

'use client';

import { permissionsText } from './scope-panel-helpers';

interface ProviderScopePanelProps {
  perms: string[];
}

export function ProviderScopePanel({ perms }: ProviderScopePanelProps) {
  return (
    <>
      <p className="text-xs text-gray-500 mt-2">Permissions: {permissionsText(perms)}</p>
      <p className="text-xs text-gray-500">Expires: Never</p>
    </>
  );
}
