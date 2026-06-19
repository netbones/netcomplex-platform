import { DEFAULT_TIER_THRESHOLDS, STANDING_TIER_CONFIG } from './constants';
import type { StandingTier } from './types';

export function getStandingTier(
  overall: number,
  thresholds?: Partial<typeof DEFAULT_TIER_THRESHOLDS>
): StandingTier {
  const t = { ...DEFAULT_TIER_THRESHOLDS, ...thresholds };
  if (overall >= t.GOLD) return 'GOLD';
  if (overall >= t.SILVER) return 'SILVER';
  if (overall >= t.BRONZE) return 'BRONZE';
  if (overall > t.PROBATION) return 'WATCHLIST';
  return 'PROBATION';
}

export function getStandingTierConfig(tier: StandingTier) {
  return STANDING_TIER_CONFIG[tier];
}
