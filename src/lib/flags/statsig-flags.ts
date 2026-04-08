import { dedupe } from 'flags/next';
import type { ReadonlyRequestCookies } from 'flags';

interface FlagEntities {
  tenant?: { id: string };
  user?: { id: string; role?: string; householdId?: string };
  household?: { id: string; type?: string };
}

const identify = dedupe(({ cookies }: { cookies: ReadonlyRequestCookies }) => {
  const tenantId = cookies.get('x-tenant-id')?.value;
  const userId = cookies.get('user-id')?.value;

  return {
    tenant: tenantId ? { id: tenantId } : undefined,
    user: userId ? { id: userId } : undefined,
    household: undefined,
  };
});

// Experiment flags - these would use Statsig when SDK is configured
// For now, they return default values
// To enable Statsig: import { statsigAdapter } from '@flags-sdk/statsig' and add adapter to each flag

interface ExperimentFlag {
  key: string;
  evaluate: () => boolean;
}

const experimentFlags: ExperimentFlag[] = [
  { key: 'newDashboard', evaluate: () => false },
  { key: 'chatV2', evaluate: () => false },
  { key: 'newBookingFlow', evaluate: () => false },
  { key: 'customBrandingV2', evaluate: () => false },
  { key: 'premiumGardenFeatures', evaluate: () => false },
  { key: 'adminAnalyticsPlus', evaluate: () => false },
];

export async function getStatsigExperimentFlags(): Promise<Record<string, boolean>> {
  const flags: Record<string, boolean> = {};

  for (const experiment of experimentFlags) {
    try {
      flags[experiment.key] = experiment.evaluate();
    } catch (error) {
      console.error(`Failed to evaluate flag ${experiment.key}:`, error);
      flags[experiment.key] = false;
    }
  }

  return flags;
}

// Re-export for compatibility
export const identifyFunction = identify;
