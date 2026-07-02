/**
 * WorkspaceSelector — Hierarchical workspace switcher (WS-04).
 *
 * Registry-driven tree with search/recent/pinned/all, virtualisation
 * above 100 rows, and full keyboard a11y. See plan 122-04 for design.
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
import { Building2, Search, Pin, ChevronDown } from 'lucide-react';

import type { WorkspaceType } from '@entities/workspace';
import { useDelegations } from '@entities/delegation';
import { useSwitchWorkspace } from '@features/workspace';
import { useWorkspaceRecentStore, useWorkspacePinnedStore } from '@features/workspace';

import {
  VIRTUALIZATION_THRESHOLD,
  ROW_HEIGHT,
  resolveIcon,
  typeColor,
  buildAllRows,
  type SelectorRow,
} from './workspace-selector-utils';

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

interface SelectorRowViewProps {
  row: SelectorRow;
  isActive: boolean;
  onSelect: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  rowRef?: RefObject<HTMLDivElement | null>;
}

function SelectorRowView({ row, isActive, onSelect, onKeyDown, rowRef }: SelectorRowViewProps) {
  const Icon = resolveIcon(row.icon);
  const colorClass = typeColor(row.type);

  return (
    <div
      ref={rowRef as RefObject<HTMLDivElement>}
      role="option"
      aria-selected={isActive}
      aria-disabled={row.disabled}
      tabIndex={-1}
      onClick={() => {
        if (!row.disabled) onSelect();
      }}
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
// WorkspaceSelector
// ═══════════════════════════════════════════════════════════════

export function WorkspaceSelector() {
  const { data: delegations } = useDelegations();
  const delegationList = delegations ?? [];
  const switchWorkspace = useSwitchWorkspace();
  const recentStore = useWorkspaceRecentStore();
  const pinnedStore = useWorkspacePinnedStore();
  const recentItems = recentStore.items;
  const pinnedItems = pinnedStore.items;

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('soralia:workspace-tree-expanded') ?? '{}');
      } catch {
        /* ignore */
      }
    }
    return {};
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('soralia:workspace-tree-expanded', JSON.stringify(expanded));
    }
  }, [expanded]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Build + filter rows
  const allRows = useMemo(() => buildAllRows(delegationList, expanded), [delegationList, expanded]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return allRows;
    const q = searchQuery.toLowerCase();
    return allRows.filter(r => r.label.toLowerCase().includes(q));
  }, [allRows, searchQuery]);

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

  // Virtualisation
  const shouldVirtualize = filteredRows.length > VIRTUALIZATION_THRESHOLD;
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? filteredRows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const clampedIndex = Math.min(activeIndex, Math.max(0, filteredRows.length - 1));

  // Handlers
  const selectRow = useCallback(
    (row: SelectorRow) => {
      if (row.disabled) return;
      switchWorkspace({
        workspaceType: row.type,
        delegationId: row.delegationId,
        propertyId: row.snapshot.scope?.propertyId,
      })
        .then(() => {
          recentStore.addRecent(row.snapshot);
          setOpen(false);
        })
        .catch(() => {});
    },
    [switchWorkspace, recentStore]
  );

  const toggleExpand = useCallback((type: string) => {
    setExpanded(prev => ({ ...prev, [type]: prev[type] === false ? true : false }));
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const isSearchFocused = document.activeElement?.getAttribute('type') === 'text';
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex(p => Math.min(p + 1, filteredRows.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(p => Math.max(p - 1, 0));
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (filteredRows[clampedIndex]?.type === 'PROVIDER') toggleExpand('PROVIDER');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setExpanded(prev => ({ ...prev, PROVIDER: false }));
          break;
        case 'Enter':
          e.preventDefault();
          selectRow(filteredRows[clampedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
        case '/':
          if (!isSearchFocused) {
            e.preventDefault();
            searchInputRef.current?.focus();
            setSearchQuery('');
          }
          break;
      }
    },
    [filteredRows, clampedIndex, selectRow, toggleExpand]
  );

  // Global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Visibility flags
  const hasRecent = filteredRecent.length > 0 && !searchQuery.trim();
  const hasPinned = filteredPinned.length > 0 && !searchQuery.trim();
  const hasResults = filteredRows.length > 0;
  const showSearchEmpty =
    searchQuery.trim().length > 0 &&
    !filteredRows.length &&
    !filteredRecent.length &&
    !filteredPinned.length;

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
          <span className="max-w-[120px] truncate">Workspace</span>
          <ChevronDown className="h-3 w-3 text-gray-400" aria-hidden="true" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[320px] bg-white rounded-lg shadow-lg border border-gray-200 focus:outline-none overflow-hidden"
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={e => e.preventDefault()}
        >
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
                  if (e.key === 'Escape') setOpen(false);
                }}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
              />
            </div>
          </div>

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
                {hasRecent && (
                  <div className="border-b border-gray-50">
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Recent
                    </div>
                    {filteredRecent.map(item => (
                      <div
                        key={item.workspaceId}
                        role="option"
                        aria-selected={false}
                        tabIndex={-1}
                        onClick={() =>
                          switchWorkspace({
                            workspaceType: item.workspaceType as WorkspaceType,
                            propertyId: item.scope?.propertyId,
                          })
                            .then(() => {
                              recentStore.addRecent(item);
                              setOpen(false);
                            })
                            .catch(() => {})
                        }
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 text-sm"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <span className="text-gray-500 truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {hasPinned && (
                  <div className="border-b border-gray-50">
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Pin className="h-3 w-3" aria-hidden="true" /> Pinned
                    </div>
                    {filteredPinned.map(item => (
                      <div
                        key={item.workspaceId}
                        role="option"
                        aria-selected={false}
                        tabIndex={-1}
                        onClick={() =>
                          switchWorkspace({
                            workspaceType: item.workspaceType as WorkspaceType,
                            propertyId: item.scope?.propertyId,
                          })
                            .then(() => {
                              recentStore.addRecent(item);
                              setOpen(false);
                            })
                            .catch(() => {})
                        }
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 text-sm"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <span className="text-gray-500 truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {hasResults && (
                  <div>
                    {!searchQuery.trim() && !hasRecent && !hasPinned && (
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        All
                      </div>
                    )}
                    {shouldVirtualize
                      ? rowVirtualizer.getVirtualItems().map(vr => {
                          const row = filteredRows[vr.index];
                          return (
                            <SelectorRowView
                              key={vr.key}
                              row={row}
                              isActive={vr.index === clampedIndex}
                              onSelect={() => selectRow(row)}
                              onKeyDown={handleKeyDown}
                            />
                          );
                        })
                      : filteredRows.map((row, i) => (
                          <SelectorRowView
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

          <div className="px-3 py-1.5 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">&uarr;&darr;</kbd>{' '}
              Navigate
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
