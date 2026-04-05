// Sync tenant.featureFlags with registry defaults on tenant creation/update
import type { TierLevel } from './registry';
import { getFeaturesForTier } from './registry';

export function mergeFeatureFlags(
  tenantFlags: Record<string, boolean> = {},
  tier: TierLevel
): Record<string, boolean> {
  const defaults = getFeaturesForTier(tier).reduce(
    (acc: Record<string, boolean>, f) => {
      acc[f.key] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );
  return { ...defaults, ...tenantFlags };
}
