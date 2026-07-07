import 'server-only';

import { db, setupMissions } from '@api/server';
import { eq, and } from 'drizzle-orm';
import { recalculateCompletionPercent } from './get-setup';

/**
 * Toggle a mission's completion status and update parent progress.
 * If completing, sets completedAt to now. If uncompleting, clears it.
 * Returns the updated mission and new completionPercent.
 */
export async function upsertMission(
  setupId: string,
  missionKey: string,
  updates: { isCompleted: boolean },
) {
  const missions = await db
    .select()
    .from(setupMissions)
    .where(
      and(
        eq(setupMissions.tenantSetupId, setupId),
        eq(setupMissions.missionKey, missionKey),
      ),
    )
    .limit(1);

  if (!missions[0]) {
    return { mission: null, completionPercent: null };
  }

  const completedAt = updates.isCompleted ? new Date() : null;

  const [updated] = await db
    .update(setupMissions)
    .set({
      isCompleted: updates.isCompleted,
      completedAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(setupMissions.tenantSetupId, setupId),
        eq(setupMissions.missionKey, missionKey),
      ),
    )
    .returning();

  const completionPercent = await recalculateCompletionPercent(setupId);

  return { mission: updated, completionPercent };
}
