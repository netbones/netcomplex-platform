// Sync tenant.featureFlags with registry defaults on tenant creation/update
export function mergeFeatureFlags(
  tenantFlags: Record<string, boolean> = {},
  tier: TierLevel
): Record<string, boolean> {
  const defaults = getFeaturesForTier(tier).reduce(
    (acc, f) => {
      acc[f.key] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );
  return { ...defaults, ...tenantFlags };
}
