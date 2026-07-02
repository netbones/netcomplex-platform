/**
 * Workspace permissions — derived from the canonical AgentScope taxonomy.
 *
 * The Permission type is a union of the keys in SCOPE_LABELS plus a
 * (string & {}) fallback for forward-compatible additions. This mirrors
 * the Pattern B cross-ref described in RESEARCH §9.2 and PATTERNS.md
 * §"Permission type union".
 *
 * No new enum or hardcoded permission list is invented here — the source
 * of truth is `@entities/delegation/types.ts` SCOPE_LABELS.
 */

import type { SCOPE_LABELS } from '@entities/delegation/types';

/**
 * A workspace permission key.
 *
 * Derived from the canonical AgentScope taxonomy (SCOPE_LABELS).
 * The `(string & {})` union member allows forward-compatible additions
 * without widening to `string` (preserves autocomplete on known keys).
 */
export type Permission = keyof typeof SCOPE_LABELS | (string & {});
