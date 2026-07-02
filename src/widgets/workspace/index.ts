/**
 * widgets/workspace — public API barrel
 *
 * Exports all four workspace widgets. Three are STUB components
 * replaced in P1a-04/05/06 by parallel wave plans.
 *
 * Pattern C: selective re-export (mirrors src/features/gate/index.ts).
 * Steiger R-04: barrel-first sequencing prevents same-wave barrel collision
 * with wave 4 builders.
 */

// Real implementation (P1a-03 / D-07)
export { NotificationLink } from './ui/NotificationLink';
export type { NotificationLinkProps } from './ui/NotificationLink';

// STUBS — replaced in place by P1a-04/05/06 (do NOT consume before then)
export { WorkspaceSelector } from './ui/WorkspaceSelector';
export { EmptyWorkspaceState } from './ui/EmptyWorkspaceState';
export { WorkspaceScopePanel } from './ui/WorkspaceScopePanel';
