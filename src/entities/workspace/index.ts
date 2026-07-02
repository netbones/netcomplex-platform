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
// registry re-export added in Task 3 (GREEN) after registry.ts is created
