/**
 * entities/workspace — public API barrel
 *
 * Steiger's public-api-presence rule requires a public API marker.
 * This barrel re-exports the model symbols consumers need.
 *
 * Pattern C: selective re-export (mirrors src/entities/delegation/index.ts).
 */

export * from './model/types';
export * from './model/permissions';
export * from './model/registry';
