import type { StandingTier } from './types';

export const BEHAVIOR_POINTS = {
  MERIT: 5, // recognitionPoints
  WARNING: 2, // disciplinaryPoints (stored as positive)
  INFRACTION: 10, // disciplinaryPoints
} as const;

export const DEFAULT_TIER_THRESHOLDS = {
  GOLD: 50,
  SILVER: 20,
  BRONZE: 0,
  // Watchlist: between -1 and -20 (inclusive)
  PROBATION: -20,
} as const;

export const DEFAULT_EXPIRY_DAYS = {
  WARNING: 180, // 6 months
  INFRACTION: 730, // 24 months
  MERIT: null, // merits never expire
} as const;

export const ESCALATION_THRESHOLDS = {
  REVIEW_FLAG: 3, // 3 active infractions → admin review flag
  SUSPENSION_RECOMMENDATION: 5, // 5 active infractions → suspension recommendation
} as const;

export const STANDING_TIER_CONFIG: Record<
  StandingTier,
  { label: string; publicLabel: string | null; colorClasses: string }
> = {
  GOLD: {
    label: 'Gold Standing',
    publicLabel: 'Gold Standing',
    colorClasses: 'bg-amber-100 text-amber-800',
  },
  SILVER: {
    label: 'Silver Standing',
    publicLabel: 'Silver Standing',
    colorClasses: 'bg-gray-200 text-gray-700',
  },
  BRONZE: {
    label: 'Bronze Standing',
    publicLabel: 'Community Member',
    colorClasses: 'bg-emerald-100 text-emerald-800',
  },
  WATCHLIST: {
    label: 'Watchlist',
    publicLabel: null,
    colorClasses: 'bg-yellow-100 text-yellow-800',
  },
  PROBATION: {
    label: 'Probation',
    publicLabel: null,
    colorClasses: 'bg-red-100 text-red-800',
  },
};
