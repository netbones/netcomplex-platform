import { eq, and, sql } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';
import { db } from '../db';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { tenantAchievements } from '@schema/tenant-achievements';
import { userAchievementProgresses } from '@schema/user-achievement-progresses';
import { userAchievements } from '@schema/user-achievements';
import { notifications } from '@schema/notifications';

const log = createComponentLogger('achievements');

interface ProcessAchievementEventInput {
  tenantId: string;
  userId: string;
  eventType: string;
}

export async function processAchievementEvent({
  tenantId,
  userId,
  eventType,
}: ProcessAchievementEventInput): Promise<void> {
  try {
    const definitions = await db
      .select({
        id: achievementDefinitions.id,
        key: achievementDefinitions.key,
        label: achievementDefinitions.label,
        threshold: achievementDefinitions.threshold,
        customThreshold: tenantAchievements.customThreshold,
        enabled: tenantAchievements.enabled,
      })
      .from(achievementDefinitions)
      .leftJoin(
        tenantAchievements,
        and(
          eq(tenantAchievements.definitionId, achievementDefinitions.id),
          eq(tenantAchievements.tenantId, tenantId)
        )
      )
      .where(eq(achievementDefinitions.eventType, eventType));

    for (const def of definitions) {
      if (def.enabled === false) continue;

      const threshold = def.customThreshold ?? def.threshold;

      await db
        .insert(userAchievementProgresses)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          userId,
          definitionId: def.id,
          count: 1,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userAchievementProgresses.userId, userAchievementProgresses.definitionId],
          set: {
            count: sql`${userAchievementProgresses.count} + 1`,
            updatedAt: new Date(),
          },
        });

      const [updated] = await db
        .select({ count: userAchievementProgresses.count })
        .from(userAchievementProgresses)
        .where(
          and(
            eq(userAchievementProgresses.userId, userId),
            eq(userAchievementProgresses.definitionId, def.id)
          )
        )
        .limit(1);

      if (updated && updated.count >= threshold) {
        const [existing] = await db
          .select({ id: userAchievements.id })
          .from(userAchievements)
          .where(
            and(eq(userAchievements.userId, userId), eq(userAchievements.definitionId, def.id))
          )
          .limit(1);

        if (!existing) {
          await db.insert(userAchievements).values({
            id: crypto.randomUUID(),
            tenantId,
            userId,
            definitionId: def.id,
          });

          await db.insert(notifications).values({
            id: crypto.randomUUID(),
            tenantId,
            userId,
            title: 'Achievement Unlocked!',
            message: `You earned: ${def.label}`,
            type: 'success',
            link: '/dashboard',
          });

          log.info({ tenantId, userId, achievementKey: def.key }, 'Achievement unlocked');
        }
      }
    }
  } catch (err) {
    log.error({ err, tenantId, userId, eventType }, 'Failed to process achievement event');
  }
}
