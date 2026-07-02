/**
 * WorkspaceSelector — Hierarchical workspace switcher (WS-04).
 *
 * Replaces the plan 122-03 stub. Registry-driven tree with:
 *   - Recent (last 5), Pinned (persisted), All groups
 *   - Virtualisation above 100 rows via @tanstack/react-virtual (Pattern J)
 *   - Radix Popover (non-modal) with keyboard navigation
 *   - Search filtering across all groups simultaneously
 *   - OWNER disabled (aria-disabled, Coming in P2 tooltip — D-03)
 *   - AUTOMATION never rendered (getEnabledDefinitions excludes it — D-11)
 *
 * Design constraints:
 *   - C-04: NO role checks — visible rows driven by registry + delegations
 *   - C-05: registry-driven, no hardcoded workspace logic
 *   - D-04: Delegated Properties nested under Provider
 *   - D-08/D-10/R-09: Recent/Pinned snapshots only (no permissions[] cached)
 */

'use client';

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  User,
  Building2,
  Home,
  ShieldCheck,
  Bot,
  Search,
  Pin,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  WORKSPACE_REGISTRY,
  getEnabledDefinitions,
  getDefinition,
  type WorkspaceDefinition,
} from '@entities/workspace';
import type { WorkspaceType } from '@entities/workspace';
import { useDelegations } from '@entities/delegation';
import { useSwitchWorkspace } from '@features/workspace';
import {
  useWorkspaceRecentStore,
  useWorkspacePinnedStore,
  type WorkspaceSnapshot,
} from '@features/workspace';

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const VIRTUALIZATION_THRESHOLD = 100;
const ROW_HEIGHT = 44;
const OVERSCAN = 5;

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
function resolveIcon(key: string | undefined): LucideIcon {
  if (key && ICON_MAP[key]) return ICON_MAP[key];
  return Home; // fallback
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface SelectorRow {
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

/** Metadata about expanded/collapsed subtrees. */
interface TreeExpandedState {
  expanded: Record<string, boolean>;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Build a snapshot from a WorkspaceDefinition. */
function defToSnapshot(def: WorkspaceDefinition): WorkspaceSnapshot {
  return {
    workspaceId: `type:${def.type}`,
    workspaceType: def.type,
    label: def.label,
  };
}

/** Build a PROPERTY row snapshot from a DelegationListItem. */
function delegationToSnapshot(
  d: import('@entities/delegation').DelegationListItem
): WorkspaceSnapshot {
  return {
    workspaceId: `property:${d.propertyId}`,
    workspaceType: 'PROPERTY',
    label: d.propertyAddress ?? `Property ${d.propertyId}`,
    scope: { propertyId: d.propertyId },
  };
}

/** Flatten the registry hierarchy into a flat list of SelectorRows for rendering. */
function buildAllRows(
  delegations: import('@entities/delegation').DelegationListItem[],
  expanded: Record<string, boolean>
): SelectorRow[] {
  const enabled = getEnabledDefinitions();
  const rows: SelectorRow[] = [];

  for (const def of enabled) {
    const isOwner = def.type === 'OWNER';

    // OWNER: always rendered but disabled (D-03)
    // AUTOMATION: excluded by getEnabledDefinitions (D-11)
    rows.push({
      kind: 'workspace',
      type: def.type,
      label: def.label,
      icon: def.icon,
      snapshot: defToSnapshot(def),
      disabled: isOwner,
      depth: 0,
    });

    // Provider children: Delegated Properties (D-04)
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

// ═══════════════════════════════════════════════════════════════
// WorkspaceSelectorRow
// ═══════════════════════════════════════════════════════════════

interface WorkspaceSelectorRowProps {
  row: SelectorRow;
  isActive: boolean;
  onSelect: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  rowRef?: RefObject<HTMLDivElement | null>;
}

function WorkspaceSelectorRow({
  row,
  isActive,
  onSelect,
  onKeyDown,
  rowRef,
}: WorkspaceSelectorRowProps) {
  const Icon = resolveIcon(row.icon);
  const colorClass = TYPE_COLOR_MAP[row.type] ?? 'text-gray-600';

  const handleClick = useCallback(() => {
    if (!row.disabled) onSelect();
  }, [row.disabled, onSelect]);

  return (
    <div
      ref={rowRef as RefObject<HTMLDivElement>}
      role="option"
      aria-selected={isActive}
      aria-disabled={row.disabled}
      tabIndex={-1}
      onClick={handleClick}
      onKeyDown={onKeyDown}
      title={row.disabled ? 'Coming in P2' : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none
        ${isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'}
        ${row.disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      style={{ paddingLeft: `${12 + row.depth * 20}px`, height: ROW_HEIGHT }}
      data-testid={`workspace-row-${row.type}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} aria-hidden="true" />
      <span className={`text-sm truncate ${row.disabled ? '' : colorClass}`}>{row.label}</span>
      {row.disabled && (
        <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">Coming in P2</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WorkspaceSelector — main component
// ═══════════════════════════════════════════════════════════════

export function WorkspaceSelector() {
  // ── Data sources ─────────────────────────────────────────
  const { data: delegations } = useDelegations();
  const delegationList = delegations ?? [];
  const switchWorkspace = useSwitchWorkspace();
  const recentStore = useWorkspaceRecentStore();
  const pinnedStore = useWorkspacePinnedStore();
  const recentItems = recentStore.items;
  const pinnedItems = pinnedStore.items;

  // ── State ────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Persist tree expand state to localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soralia:workspace-tree-expanded');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore corrupt state
        }
      }
    }
    return {};
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // ── Persist expanded state ───────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('soralia:workspace-tree-expanded', JSON.stringify(expanded));
    }
  }, [expanded]);

  // ── Auto-focus search on open ────────────────────────────
  useEffect(() => {
    if (open && searchInputRef.current) {
      // Small delay to let Popover animation complete
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ── Build rows ───────────────────────────────────────────
  const allRows = useMemo(() => buildAllRows(delegationList, expanded), [delegationList, expanded]);

  // ── Filter by search ─────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return allRows;
    const q = searchQuery.toLowerCase();
    return allRows.filter(r => r.label.toLowerCase().includes(q));
  }, [allRows, searchQuery]);

  // ── Recent / Pinned filtered ─────────────────────────────
  const filteredRecent = useMemo(() => {
    if (!searchQuery.trim()) return recentItems.slice(0, 5);
    const q = searchQuery.toLowerCase();
    return recentItems.filter(r => r.label.toLowerCase().includes(q)).slice(0, 5);
  }, [recentItems, searchQuery]);

  const filteredPinned = useMemo(() => {
    if (!searchQuery.trim()) return pinnedItems;
    const q = searchQuery.toLowerCase();
    return pinnedItems.filter(r => r.label.toLowerCase().includes(q));
  }, [pinnedItems, searchQuery]);

  // ── Virtualisation ───────────────────────────────────────
  const shouldVirtualize = filteredRows.length > VIRTUALIZATION_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? filteredRows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  // ── Active row clamping ──────────────────────────────────
  const clampedIndex = Math.min(activeIndex, Math.max(0, filteredRows.length - 1));

  // ── Handlers ─────────────────────────────────────────────

  const selectRow = useCallback(
    (row: SelectorRow) => {
      if (row.disabled) return;

      const target = {
        workspaceType: row.type,
        delegationId: row.delegationId,
        propertyId: row.snapshot.scope?.propertyId,
      };

      switchWorkspace(target)
        .then(() => {
          recentStore.addRecent(row.snapshot);
          setOpen(false);
        })
        .catch(() => {
          // switchWorkspace handles toast errors internally
        });
    },
    [switchWorkspace, recentStore]
  );

  const toggleExpand = useCallback((type: string) => {
    setExpanded(prev => ({ ...prev, [type]: prev[type] === false ? true : false }));
  }, []);

  const handleRowSelect = useCallback(
    (index: number) => {
      const row = filteredRows[index];
      if (row) selectRow(row);
    },
    [filteredRows, selectRow]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const popoverContent = e.currentTarget.closest('[role="dialog"]');
      const searchInput = popoverContent?.querySelector('input');
      const isSearchFocused = document.activeElement === searchInput;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex(prev => Math.min(prev + 1, filteredRows.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'ArrowRight': {
          e.preventDefault();
          const row = filteredRows[clampedIndex];
          if (row?.type === 'PROVIDER') {
            toggleExpand('PROVIDER');
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          const row = filteredRows[clampedIndex];
          if (row?.type === 'PROVIDER') {
            setExpanded(prev => ({ ...prev, PROVIDER: false }));
          }
          break;
        }
        case 'Enter':
          e.preventDefault();
          handleRowSelect(clampedIndex);
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
        case '/':
          // Only capture '/' when not typing in search
          if (!isSearchFocused) {
            e.preventDefault();
            searchInputRef.current?.focus();
            setSearchQuery('');
          }
          break;
        default:
          break;
      }
    },
    [filteredRows, clampedIndex, handleRowSelect, toggleExpand]
  );

  // ── CMD/Ctrl+K global shortcut ──────────────────────────
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Render ───────────────────────────────────────────────
  const currentLabel = 'Workspace';

  // Count total visible rows including groups
  const hasRecent = filteredRecent.length > 0;
  const hasPinned = filteredPinned.length > 0;
  const hasResults = filteredRows.length > 0;

  // Determine what's visible
  const showSearchEmpty = searchQuery.trim().length > 0 && !hasRecent && !hasPinned && !hasResults;

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <Popover.Trigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700
            bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200
            transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Open workspace selector"
        >
          <Building2 className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <span className="max-w-[120px] truncate">{currentLabel}</span>
          <ChevronDown className="h-3 w-3 text-gray-400" aria-hidden="true" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[320px] bg-white rounded-lg shadow-lg border border-gray-200
            focus:outline-none overflow-hidden"
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={e => e.preventDefault()}
        >
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                  }
                }}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md
                  focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
                  placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Scrollable content */}
          <div
            ref={parentRef}
            className="max-h-[400px] overflow-y-auto"
            data-testid="workspace-selector-list"
          >
            {showSearchEmpty && (
              <div className="px-3 py-6 text-center text-sm text-gray-400">
                No workspaces match &ldquo;{searchQuery}&rdquo;.
              </div>
            )}

            {!showSearchEmpty && (
              <>
                {/* Recent section */}
                {hasRecent && !searchQuery.trim() && (
                  <div className="border-b border-gray-50">
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Recent
                    </div>
                    {filteredRecent.map((item, i) => (
                      <div
                        key={item.workspaceId}
                        role="option"
                        aria-selected={false}
                        tabIndex={-1}
                        onClick={() => {
                          switchWorkspace({
                            workspaceType: item.workspaceType as WorkspaceType,
                            propertyId: item.scope?.propertyId,
                          })
                            .then(() => {
                              recentStore.addRecent(item);
                              setOpen(false);
                            })
                            .catch(() => {});
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 text-sm"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <span className="text-gray-500 truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pinned section */}
                {hasPinned && !searchQuery.trim() && (
                  <div className="border-b border-gray-50">
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Pin className="h-3 w-3" aria-hidden="true" />
                      Pinned
                    </div>
                    {filteredPinned.map(item => (
                      <div
                        key={item.workspaceId}
                        role="option"
                        aria-selected={false}
                        tabIndex={-1}
                        onClick={() => {
                          switchWorkspace({
                            workspaceType: item.workspaceType as WorkspaceType,
                            propertyId: item.scope?.propertyId,
                          })
                            .then(() => {
                              recentStore.addRecent(item);
                              setOpen(false);
                            })
                            .catch(() => {});
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 text-sm"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <span className="text-gray-500 truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* All workspaces section */}
                {hasResults && (
                  <div>
                    {!searchQuery.trim() &&
                      filteredRecent.length === 0 &&
                      filteredPinned.length === 0 && (
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          All
                        </div>
                      )}
                    {shouldVirtualize
                      ? rowVirtualizer.getVirtualItems().map(virtualRow => {
                          const row = filteredRows[virtualRow.index];
                          return (
                            <WorkspaceSelectorRow
                              key={virtualRow.key}
                              row={row}
                              isActive={virtualRow.index === clampedIndex}
                              onSelect={() => selectRow(row)}
                              onKeyDown={handleKeyDown}
                            />
                          );
                        })
                      : filteredRows.map((row, i) => (
                          <WorkspaceSelectorRow
                            key={`${row.type}-${row.snapshot.workspaceId}-${i}`}
                            row={row}
                            isActive={i === clampedIndex}
                            onSelect={() => selectRow(row)}
                            onKeyDown={handleKeyDown}
                          />
                        ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Keyboard shortcut hint */}
          <div className="px-3 py-1.5 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Enter</kbd> Switch
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Esc</kbd> Close
            </span>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
