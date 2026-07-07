import 'server-only';

import { db, tenantSetups, setupMissions } from '@api/server';
import { eq } from 'drizzle-orm';
import type { SetupSection } from '../types';

/**
 * Fetch a tenant's full setup state: progress tracker + missions grouped by section.
 * Returns null if no TenantSetup record exists for the given tenant.
 */
export async function getTenantSetup(tenantId: string) {
  const setups = await db
    .select()
    .from(tenantSetups)
    .where(eq(tenantSetups.tenantId, tenantId))
    .limit(1);

  if (!setups[0]) return null;

  const setup = setups[0];

  const missions = await db
    .select()
    .from(setupMissions)
    .where(eq(setupMissions.tenantSetupId, setup.id))
    .orderBy(setupMissions.sortOrder);

  // Group missions by section
  const grouped: Record<SetupSection, typeof missions> = {
    launch: [],
    populate: [],
    configure: [],
    grow: [],
  };

  for (const m of missions) {
    const section = m.section as SetupSection;
    if (grouped[section]) {
      grouped[section].push(m);
    }
  }

  return {
    ...setup,
    missions: grouped,
  };
}

/**
 * Recalculate completionPercent from all missions for a given TenantSetup.
 * Returns the new percentage (0-100).
 */
export async function recalculateCompletionPercent(setupId: string): Promise<number> {
  const missions = await db
    .select({ isCompleted: setupMissions.isCompleted })
    .from(setupMissions)
    .where(eq(setupMissions.tenantSetupId, setupId));

  if (missions.length === 0) return 0;

  const completed = missions.filter((m) => m.isCompleted).length;
  const percent = Math.round((completed / missions.length) * 100);

  await db
    .update(tenantSetups)
    .set({ completionPercent: percent, updatedAt: new Date() })
    .where(eq(tenantSetups.id, setupId));

  return percent;
}
