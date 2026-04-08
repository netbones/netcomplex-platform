import { getPlatformPageFlags, type PlatformPageFlags } from './platform-flags';
import { getStatsigExperimentFlags } from './statsig-flags';
import { withTenantOptional } from '@/lib/tenant/with-tenant';

export interface AllPageFlags extends PlatformPageFlags {
  newDashboard: boolean;
  chatV2: boolean;
  newBookingFlow: boolean;
  customBrandingV2: boolean;
  premiumGardenFeatures: boolean;
  adminAnalyticsPlus: boolean;
}

export async function getPageFlags(): Promise<AllPageFlags> {
  const { tenantId } = await withTenantOptional();
  const resolvedTenantId = tenantId || 'default';

  const platformFlags = await getPlatformPageFlags(resolvedTenantId);

  let statsigFlags: Record<string, boolean> = {};
  try {
    statsigFlags = await getStatsigExperimentFlags();
  } catch (error) {
    console.error('Failed to get Statsig flags:', error);
  }

  return {
    ...platformFlags,
    newDashboard: statsigFlags.newDashboard ?? false,
    chatV2: statsigFlags.chatV2 ?? false,
    newBookingFlow: statsigFlags.newBookingFlow ?? false,
    customBrandingV2: statsigFlags.customBrandingV2 ?? false,
    premiumGardenFeatures: statsigFlags.premiumGardenFeatures ?? false,
    adminAnalyticsPlus: statsigFlags.adminAnalyticsPlus ?? false,
  };
}

export async function getPageFlag(flag: keyof PlatformPageFlags): Promise<boolean | string> {
  const flags = await getPageFlags();
  return flags[flag];
}

export async function getExperimentFlag(experiment: string): Promise<boolean> {
  const experiments = await getStatsigExperimentFlags();
  return experiments[experiment] || false;
}
