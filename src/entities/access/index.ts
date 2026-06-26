/**
 * Access Control — Public Barrel
 *
 * Re-exports the canonical types and resolver for page navigation access control.
 * Import from @entities/access to get the full access resolution API.
 *
 * Phase 110-01: Entity layer for page navigation access control.
 */

// Types
export type {
  AccessInput,
  AccessContext,
  AccessResolution,
  PageAccess,
  SpaceAccess,
  FeatureAccess,
} from './types';

// Resolver
export { resolvePageAccess } from './resolver';
