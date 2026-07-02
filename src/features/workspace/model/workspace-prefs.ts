/**
 * Workspace Preferences — Zustand stores for Recent + Pinned workspaces.
 *
 * Design constraints (D-08, R-09):
 *   - Snapshots hold ONLY { workspaceId, workspaceType, label, scope } —
 *     NEVER permissions[] or full WorkspaceContext. The snapshot-guard test
 *     asserts JSON.stringify of any stored entry never contains 'permissions'.
 *   - useWorkspaceRecentStore: capped at last 5 entries.
 *   - useWorkspacePinnedStore: unlimited, persisted to localStorage.
 *   - These are SEPARATE stores from WorkspaceContext (D-08 rationale).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Snapshot Types ──────────────────────────────────────────────────

/**
 * A lightweight workspace snapshot for Recent/Pinned preferences.
 *
 * INTENTIONALLY does NOT include `permissions[]` or full WorkspaceContext.
 * The snapshot-guard test asserts no 'permissions' key in the serialized form.
 */
export interface WorkspaceSnapshot {
  /** Unique workspace identifier. */
  workspaceId: string;
  /** The workspace type. */
  workspaceType: string;
  /** Human-readable label for display. */
  label: string;
  /** Optional scope reference (property/provider/owner IDs). */
  scope?: {
    propertyId?: string;
    providerId?: string;
    ownerId?: string;
  };
}

// ── Recent Store (last 5) ──────────────────────────────────────────

interface RecentState {
  items: WorkspaceSnapshot[];
  /** Prepend a snapshot and trim to max 5. Deduplicates by workspaceId. */
  addRecent: (snapshot: WorkspaceSnapshot) => void;
  /** Clear all recent entries. */
  clearRecent: () => void;
}

/**
 * In-memory recent workspace store — capped at last 5 entries.
 * NOT persisted (intentional — recent list is session-scoped).
 */
export const useWorkspaceRecentStore = create<RecentState>()(set => ({
  items: [],
  addRecent: (snapshot: WorkspaceSnapshot) =>
    set(state => {
      // Remove existing entry with same workspaceId (deduplicate)
      const filtered = state.items.filter(i => i.workspaceId !== snapshot.workspaceId);
      // Prepend and trim
      return { items: [snapshot, ...filtered].slice(0, 5) };
    }),
  clearRecent: () => set({ items: [] }),
}));

// ── Pinned Store (persisted) ───────────────────────────────────────

interface PinnedState {
  items: WorkspaceSnapshot[];
  /** Toggle a workspace in/out of pinned. */
  togglePinned: (snapshot: WorkspaceSnapshot) => void;
  /** Check if a workspaceId is currently pinned. */
  isPinned: (workspaceId: string) => boolean;
}

/**
 * Persisted pinned workspace store — survives page reloads.
 * Stored under localStorage key 'soralia:workspace-pinned'.
 */
export const useWorkspacePinnedStore = create<PinnedState>()(
  persist(
    (set, get) => ({
      items: [],
      togglePinned: (snapshot: WorkspaceSnapshot) =>
        set(state => {
          const exists = state.items.some(i => i.workspaceId === snapshot.workspaceId);
          if (exists) {
            return { items: state.items.filter(i => i.workspaceId !== snapshot.workspaceId) };
          }
          return { items: [...state.items, snapshot] };
        }),
      isPinned: (workspaceId: string) => get().items.some(i => i.workspaceId === workspaceId),
    }),
    {
      name: 'soralia:workspace-pinned',
    }
  )
);
