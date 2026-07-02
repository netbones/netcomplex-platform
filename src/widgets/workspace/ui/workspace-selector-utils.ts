/**
 * WorkspaceSelector utilities — shared helpers, types, and constants.
 *
 * Extracted from WorkspaceSelector.tsx to keep main component under
 * the 200-line AGENTS.md React limit.
 */

import { User, Building2, Home, ShieldCheck, Bot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DelegationListItem } from '@entities/delegation';
import { getEnabledDefinitions } from '@entities/workspace';
import type { WorkspaceType, WorkspaceDefinition } from '@entities/workspace';
import type { WorkspaceSnapshot } from '@features/workspace';

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

export const VIRTUALIZATION_THRESHOLD = 100;
export const ROW_HEIGHT = 44;

/** Icon string-key → LucideIcon resolver (Pattern A: widgets resolve icons). */
const ICON_MAP: Record<string, LucideIcon> = {
  User,
  Building2,
  Home,
  ShieldCheck,
  Bot,
};

/** Per-type color classes (UI-SPEC §Color — no new hex values). */
const TYPE_COLOR_MAP: Record<string, string> = {
  PERSONAL: 'text-gray-600',
  PROVIDER: 'text-indigo-600',
  PROPERTY: 'text-violet-600',
  OWNER: 'text-amber-600',
};

/** Extract a LucideIcon from a registry string key. */
export function resolveIcon(key: string | undefined): LucideIcon {
  if (key && ICON_MAP[key]) return ICON_MAP[key];
  return Home; // fallback
}

/** Get the color class for a workspace type. */
export function typeColor(type: string): string {
  return TYPE_COLOR_MAP[type] ?? 'text-gray-600';
}

// ═══════════════════════════════════════════════════════════════
// Selector Row
// ═══════════════════════════════════════════════════════════════

export interface SelectorRow {
  kind: 'workspace';
  type: WorkspaceType;
  label: string;
  icon: string;
  snapshot: WorkspaceSnapshot;
  disabled?: boolean;
  /** For PROPERTY rows: delegationId for resolving the switch target. */
  delegationId?: string;
  /** For tree nesting: parent type. */
  parentType?: WorkspaceType;
  /** Depth for indentation (0 = top level). */
  depth: number;
}

/** Build a snapshot from a WorkspaceDefinition. */
export function defToSnapshot(def: WorkspaceDefinition): WorkspaceSnapshot {
  return {
    workspaceId: `type:${def.type}`,
    workspaceType: def.type,
    label: def.label,
  };
}

/** Build a PROPERTY row snapshot from a DelegationListItem. */
export function delegationToSnapshot(d: DelegationListItem): WorkspaceSnapshot {
  return {
    workspaceId: `property:${d.propertyId}`,
    workspaceType: 'PROPERTY',
    label: d.propertyAddress ?? `Property ${d.propertyId}`,
    scope: { propertyId: d.propertyId },
  };
}

/** Flatten the registry hierarchy into a flat list of SelectorRows for rendering. */
export function buildAllRows(
  delegations: DelegationListItem[],
  expanded: Record<string, boolean>
): SelectorRow[] {
  const enabled = getEnabledDefinitions();
  const rows: SelectorRow[] = [];

  for (const def of enabled) {
    const isOwner = def.type === 'OWNER';
    rows.push({
      kind: 'workspace',
      type: def.type,
      label: def.label,
      icon: def.icon,
      snapshot: defToSnapshot(def),
      disabled: isOwner,
      depth: 0,
    });

    if (def.type === 'PROVIDER' && def.children && expanded[def.type] !== false) {
      const activeDelegations = delegations.filter(d => d.status === 'ACTIVE');
      for (const d of activeDelegations) {
        rows.push({
          kind: 'workspace',
          type: 'PROPERTY',
          label: d.propertyAddress ?? `Property ${d.propertyId}`,
          icon: 'Home',
          snapshot: delegationToSnapshot(d),
          delegationId: d.id,
          parentType: 'PROVIDER',
          depth: 1,
        });
      }
    }
  }

  return rows;
}
