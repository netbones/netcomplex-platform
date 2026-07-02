/**
 * WorkspaceContext — React Provider + useWorkspaceContext() hook
 *
 * 'use client' — mounts in src/app/providers.tsx (Pattern F).
 *
 * Design constraints:
 *   - C-01: WorkspaceContext is immutable — atomically replaced via React useState,
 *           never mutated in place. React's batching guarantees a single render.
 *   - D-08: No caching — context value is destroyed on provider unmount.
 *           useWorkspaceContext() returns null while unresolved (mirrors useGateContext).
 *   - C-04: No Role branching — GateContext and WorkspaceContext coexist (RESEARCH §2.2).
 *   - T-122-06: The internal setter context (WorkspaceContextSetterCtx) is NOT
 *               re-exported through features/workspace/index.ts — only switchWorkspace
 *               (P1a-03) calls it (selective-export pattern).
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { WorkspaceContext as WorkspaceContextType } from '@entities/workspace';

// ═══════════════════════════════════════════════════════════════
// Contexts
// ═══════════════════════════════════════════════════════════════

/**
 * Public read-only context. Consumers call useWorkspaceContext().
 * Returns null while unresolved — mirrors useGateContext convention.
 */
const WorkspaceContextCtx = createContext<WorkspaceContextType | null>(null);

/**
 * Internal setter context — NOT re-exported through the public barrel.
 * Only switchWorkspace (P1a-03) accesses this via useWorkspaceSetContext().
 */
const WorkspaceContextSetterCtx = createContext<Dispatch<
  SetStateAction<WorkspaceContextType | null>
> | null>(null);

// ═══════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════

interface WorkspaceContextProviderProps {
  /** Optional initial context (defaults to null — unresolved). */
  initial?: WorkspaceContextType | null;
  children: ReactNode;
}

/**
 * WorkspaceContextProvider — mounts in src/app/providers.tsx (Pattern F).
 *
 * Uses React useState for atomic replace semantics (C-01).
 * The separate setter context enables switchWorkspace (P1a-03) to
 * modify the context without exposing the setter to consumers.
 */
export function WorkspaceContextProvider({
  initial = null,
  children,
}: WorkspaceContextProviderProps) {
  // C-01: atomic replace via useState — React batching guarantees a single render
  const [ctx, setCtx] = useState<WorkspaceContextType | null>(initial);

  return (
    <WorkspaceContextCtx.Provider value={ctx}>
      <WorkspaceContextSetterCtx.Provider value={setCtx}>
        {children}
      </WorkspaceContextSetterCtx.Provider>
    </WorkspaceContextCtx.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// Public Hook
// ═══════════════════════════════════════════════════════════════

/**
 * Read the current WorkspaceContext.
 *
 * Returns `null` while no workspace has been resolved — mirrors the
 * useGateContext() null-while-loading convention (RESEARCH §2.2).
 * Use `useGateContext()` alongside this hook for access control.
 */
export function useWorkspaceContext(): WorkspaceContextType | null {
  return useContext(WorkspaceContextCtx);
}

// ═══════════════════════════════════════════════════════════════
// Internal Hook (NOT in public barrel)
// ═══════════════════════════════════════════════════════════════

/**
 * INTERNAL — used only by switchWorkspace (P1a-03).
 *
 * NOT re-exported through features/workspace/index.ts.
 * Consumers must NOT access the setter directly.
 */
export function useWorkspaceSetContext(): Dispatch<
  SetStateAction<WorkspaceContextType | null>
> | null {
  return useContext(WorkspaceContextSetterCtx);
}
