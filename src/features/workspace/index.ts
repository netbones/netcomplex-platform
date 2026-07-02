/**
 * features/workspace — public API barrel
 *
 * Selective export (Pattern C) — mirrors src/features/gate/index.ts.
 *
 * T-122-06: WorkspaceContextSetterCtx and useWorkspaceSetContext are
 * NOT exported here. Only switchWorkspace (P1a-03) accesses the setter.
 * Consumers who try to import the setter will get a compilation error.
 */

// Provider + public hook
export { WorkspaceContextProvider, useWorkspaceContext } from './model/workspace-context';

// Pure resolver + error class (NOT 'use client' — testable in isolation)
export { resolveWorkspaceContext, WorkspaceResolveError } from './model/resolve-workspace-context';

// Atomoc switch hook (P1a-03) — 5-step contract: resolve → replace → navigate → render → notify
export { useSwitchWorkspace } from './model/switch-workspace';
export type { SwitchWorkspaceFn, SwitchWorkspaceOptions } from './model/switch-workspace';

// Deep-link target inference (D-07) — pure URL → WorkspaceTarget parser
export { inferWorkspaceTarget } from './model/infer-target';

// Re-export domain types from entities layer for consumer convenience
export type { WorkspaceContext, WorkspaceTarget, WorkspaceType } from '@entities/workspace';
