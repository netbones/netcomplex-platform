/**
 * Setup entity — public API barrel.
 *
 * Re-exports all domain types, constants, validators, and API functions for the
 * persistent Setup Center (replaces the ad-hoc 7-step wizard).
 */
export type { SetupSection, MissionRef, TenantSetup, SetupMission, SetupSetting } from './types';

export { SECTIONS, DEFAULT_MISSIONS, REQUIRED_LAUNCH_MISSIONS } from './constants';
export type { SectionDef, MissionDef } from './constants';

export { setupMissionSchema, setupSettingSchema, setupProgressSchema } from './schema';
export type { SetupMissionInput, SetupSettingInput, SetupProgressInput } from './schema';

// ── Entity API functions (server-only) ──
// Import from @entities/setup/server for API functions that require server-only.
