export {
  BEHAVIOR_POINTS,
  DEFAULT_TIER_THRESHOLDS,
  DEFAULT_EXPIRY_DAYS,
  ESCALATION_THRESHOLDS,
} from './model/constants';
export type { StandingTier } from './model/types';
export {
  getEffectivePoints,
  getStandingTier,
  checkAndEscalateStanding,
  getStandingTierConfig,
} from './services';
export { canManageMerits, canResolveDisputes } from './permissions';
export { StandingBadge, getPublicStandingLabel } from './ui/StandingBadge';
