import 'server-only';

import { db, tenantSetups, setupMissions } from '@api/server';
import { createId } from '@shared/lib';
import { DEFAULT_MISSIONS } from '../constants';
import type { TierLevel } from '@shared/lib';

/**
 * Initialize TenantSetup + default missions after tenant creation.
 * Called from POST /api/platform/tenants after the user + tenant transaction.
 *
 * Tier filtering: foundation tenants skip any missions tagged as premium-only
 * (future extension — currently all missions are seeded for all tiers).
 */
export async function initTenantSetup(tenantId: string, _tier: TierLevel) {
  const setupId = createId();

  // Create the TenantSetup tracker
  await db.insert(tenantSetups).values({
    id: setupId,
    tenantId,
    completionPercent: 0,
  });

  // Seed default missions from the master catalog
  const missionEntries = Object.values(DEFAULT_MISSIONS);

  if (missionEntries.length > 0) {
    await db.insert(setupMissions).values(
      missionEntries.map((def, idx) => ({
        id: createId(),
        tenantSetupId: setupId,
        section: def.section,
        missionKey: def.missionKey,
        title: def.title,
        description: def.description,
        isRequired: def.isRequired,
        isCompleted: false,
        sortOrder: idx,
        metadata: def.metadata ?? null,
      }))
    );
  }

  return setupId;
}
