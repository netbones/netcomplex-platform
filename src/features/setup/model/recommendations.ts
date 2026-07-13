/**
 * Recommendation engine for the Grow section.
 *
 * Pure function — takes data in, returns recommendations out.
 * No API calls, no database queries, no side effects. Trivially testable.
 */

import type { TenantSetup, SetupMission, MissionRef } from '@/entities/setup';
import type { TierLevel } from '@/entities/tenant';

// ── Public Types ─────────────────────────────────────────────────

export interface RecommendedMission {
  /** Stable reference key matching a DEFAULT_MISSIONS entry. */
  missionKey: MissionRef;
  /** Display title. */
  title: string;
  /** Explanation of why this is recommended. */
  description: string;
  /** Estimated time commitment (human-readable). */
  estimatedTime: string;
  /** List of benefits the tenant gets by completing this. */
  benefits: string[];
  /** Lower = higher urgency (0 = critical, 100 = nice-to-have). */
  priority: number;
}

export interface RecommendationInput {
  /** The tenant's setup row (completion percent, launched state, etc.). */
  setup: TenantSetup;
  /** The tenant's current subscription tier. */
  tier: TierLevel;
  /**
   * Current missions indexed by missionKey.
   * If a missionKey is present and isCompleted=true, it won't be recommended.
   */
  missions: Record<string, SetupMission>;
  /**
   * Setup settings keyed by setting key.
   * Used to check population stats, module enabled state, etc.
   */
  settings: Record<string, unknown>;
}

// ── Tier Order ───────────────────────────────────────────────────

const TIER_INDEX: Record<TierLevel, number> = {
  foundation: 0,
  core: 1,
  'pro-max': 2,
};

function meetsTierThreshold(tenantTier: TierLevel, requiredTier: TierLevel): boolean {
  return TIER_INDEX[tenantTier] >= TIER_INDEX[requiredTier];
}

// ── Mission is complete? ─────────────────────────────────────────

function isMissionCompleted(missions: Record<string, SetupMission>, missionKey: string): boolean {
  const m = missions[missionKey];
  return m?.isCompleted === true;
}

// ── Settings helpers ─────────────────────────────────────────────

function getPopulateStats(settings: Record<string, unknown>): number {
  const stats = settings['populate.stats'] as { count?: number; invited?: number } | undefined;
  return stats?.count ?? 0;
}

function isModuleEnabled(settings: Record<string, unknown>, moduleKey: string): boolean {
  const val = settings[`configure.modules.${moduleKey}.enabled`];
  return val === true;
}

function isRevenueStreamSeeded(settings: Record<string, unknown>): boolean {
  const val = settings['configure.wallet.revenue'];
  return val === true || (typeof val === 'object' && val !== null);
}

// ── Recommendation Catalog ───────────────────────────────────────

interface RecommendationDef {
  missionKey: MissionRef;
  title: string;
  description: string;
  estimatedTime: string;
  benefits: string[];
  /** The default priority (can be adjusted by the rule). */
  basePriority: number;
  /** Minimum tier required to see this recommendation. */
  minTier: TierLevel;
  /**
   * Predicate: given the input, should this recommendation appear?
   * If omitted, the recommendation is always eligible when tier allows.
   */
  predicate?: (input: RecommendationInput) => boolean;
}

const CATALOG: RecommendationDef[] = [
  {
    missionKey: 'launch.identity',
    title: 'Name your community',
    description: 'Your community still needs a name — this is the first step.',
    estimatedTime: '1 min',
    benefits: ['Essential for all features', 'Appears in emails and UI'],
    basePriority: 0,
    minTier: 'foundation',
    predicate: input => !isMissionCompleted(input.missions, 'launch.identity'),
  },
  {
    missionKey: 'launch.branding',
    title: 'Brand your community',
    description: 'Set your logo, colours, and font to make your community feel like home.',
    estimatedTime: '2 min',
    benefits: ['Professional appearance', 'Builds resident trust'],
    basePriority: 1,
    minTier: 'foundation',
    predicate: input => !isMissionCompleted(input.missions, 'launch.branding'),
  },
  {
    missionKey: 'launch.domain',
    title: 'Connect a domain',
    description: 'Add a custom domain so residents can find you at your own address.',
    estimatedTime: '3 min',
    benefits: ['Professional URL', 'Better SEO'],
    basePriority: 2,
    minTier: 'foundation',
    predicate: input => !isMissionCompleted(input.missions, 'launch.domain'),
  },
  {
    missionKey: 'launch.timezone',
    title: 'Set your timezone',
    description: 'Events and reminders depend on the correct timezone being set.',
    estimatedTime: '1 min',
    benefits: ['Accurate event times', 'Correct reminders'],
    basePriority: 3,
    minTier: 'foundation',
    predicate: input => !isMissionCompleted(input.missions, 'launch.timezone'),
  },
  {
    missionKey: 'launch.address',
    title: 'Add your address',
    description: 'Your community address is needed for maps, directions, and local services.',
    estimatedTime: '2 min',
    benefits: ['Maps integration', 'Local service discovery'],
    basePriority: 4,
    minTier: 'foundation',
    predicate: input => !isMissionCompleted(input.missions, 'launch.address'),
  },
  {
    missionKey: 'populate.invite-residents',
    title: 'Invite more residents',
    description: `Your community has fewer than 5 residents — invite more to make the platform active.`,
    estimatedTime: '3 min',
    benefits: ['Active community', 'More engagement', 'Unlock community features'],
    basePriority: 8,
    minTier: 'foundation',
    predicate: input => getPopulateStats(input.settings) < 5,
  },
  {
    missionKey: 'configure.maintenance',
    title: 'Configure maintenance',
    description: 'Maintenance is enabled but not yet configured. Set up categories and teams.',
    estimatedTime: '5 min',
    benefits: ['Track repair requests', 'Assign maintenance teams'],
    basePriority: 10,
    minTier: 'core',
    predicate: input =>
      isModuleEnabled(input.settings, 'maintenance') &&
      !isMissionCompleted(input.missions, 'configure.maintenance'),
  },
  {
    missionKey: 'configure.bookings',
    title: 'Set up bookings',
    description: 'Bookings is enabled — add facilities so residents can start reserving.',
    estimatedTime: '5 min',
    benefits: ['Facility reservations', 'Time-slot management', 'Revenue from bookings'],
    basePriority: 11,
    minTier: 'core',
    predicate: input =>
      isModuleEnabled(input.settings, 'bookings') &&
      !isMissionCompleted(input.missions, 'configure.bookings'),
  },
  {
    missionKey: 'configure.wallet',
    title: 'Set up dWallet',
    description: 'dWallet is enabled but not configured. Set up data revenue streams.',
    estimatedTime: '4 min',
    benefits: ['Data revenue sharing', 'Community value distribution'],
    basePriority: 12,
    minTier: 'core',
    predicate: input =>
      isModuleEnabled(input.settings, 'dwallet') &&
      !isRevenueStreamSeeded(input.settings) &&
      !isMissionCompleted(input.missions, 'configure.wallet'),
  },
  {
    missionKey: 'grow.surveys',
    title: 'Create your first survey',
    description: 'Surveys are enabled but no surveys exist yet. Engage residents with a poll.',
    estimatedTime: '3 min',
    benefits: ['Resident feedback', 'Community insights', 'Data-driven decisions'],
    basePriority: 13,
    minTier: 'core',
    predicate: input =>
      isModuleEnabled(input.settings, 'surveys') &&
      !isMissionCompleted(input.missions, 'grow.surveys'),
  },
  {
    missionKey: 'configure.competitions',
    title: 'Configure competitions',
    description: 'Competitions are enabled — set up your first competition.',
    estimatedTime: '4 min',
    benefits: ['Community engagement', 'Leaderboards', 'Friendly competition'],
    basePriority: 14,
    minTier: 'core',
    predicate: input =>
      isModuleEnabled(input.settings, 'competitions') &&
      !isMissionCompleted(input.missions, 'configure.competitions'),
  },
  {
    missionKey: 'configure.achievements',
    title: 'Enable community achievements',
    description: 'Achievements are enabled — configure recognition badges and tiers.',
    estimatedTime: '5 min',
    benefits: ['Recognition system', 'Resident engagement', 'Milestone tracking'],
    basePriority: 15,
    minTier: 'core',
    predicate: input =>
      isModuleEnabled(input.settings, 'achievements') &&
      !isMissionCompleted(input.missions, 'configure.achievements'),
  },
  {
    missionKey: 'grow.marketplace',
    title: 'Open the marketplace',
    description: 'Marketplace is enabled — let residents offer and find local services.',
    estimatedTime: '4 min',
    benefits: ['Local economy', 'Service discovery', 'Resident entrepreneurship'],
    basePriority: 16,
    minTier: 'core',
    predicate: input =>
      isModuleEnabled(input.settings, 'marketplace') &&
      !isMissionCompleted(input.missions, 'grow.marketplace'),
  },
];

// ── Main Function ────────────────────────────────────────────────

/**
 * Generate ranked recommendations for what the tenant should do next.
 *
 * Pure function — all state comes in through `input`, all answers come out
 * via the return value. No side effects.
 *
 * @param input - The current tenant state (setup row, missions, settings, tier).
 * @returns Sorted recommendations (highest priority first). Empty array if fully set up.
 */
export function getRecommendations(input: RecommendationInput): RecommendedMission[] {
  const { setup, tier } = input;

  const results: RecommendedMission[] = [];

  // Rule 0: If completion is below 30%, focus on launch missions
  const needsLaunchFocus = setup.completionPercent < 30;

  for (const def of CATALOG) {
    // Tier gating
    if (!meetsTierThreshold(tier, def.minTier)) {
      continue;
    }

    // Predicate check — if there's a predicate, it must return true
    if (def.predicate && !def.predicate(input)) {
      continue;
    }

    // If we're in low-completion mode, only recommend launch/essential missions
    if (needsLaunchFocus && !def.missionKey.startsWith('launch.')) {
      continue;
    }

    results.push({
      missionKey: def.missionKey,
      title: def.title,
      description: def.description,
      estimatedTime: def.estimatedTime,
      benefits: def.benefits,
      priority: def.basePriority,
    });
  }

  // Sort by priority (lower = more urgent)
  results.sort((a, b) => a.priority - b.priority);

  return results;
}

// ── Re-exports for convenience ───────────────────────────────────

export { meetsTierThreshold as _meetsTierThreshold };
