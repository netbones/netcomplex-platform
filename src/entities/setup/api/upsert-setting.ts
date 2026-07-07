import 'server-only';

import { db, setupSettings } from '@api/server';
import { eq, and } from 'drizzle-orm';
import { createId } from '@shared/lib';

/**
 * Upsert a single setup setting for a tenant.
 * Creates the setting if it does not exist, updates it if it does.
 * Returns the setting record.
 */
export async function upsertSetupSetting(setupId: string, key: string, value: unknown) {
  const existing = await db
    .select()
    .from(setupSettings)
    .where(
      and(
        eq(setupSettings.tenantSetupId, setupId),
        eq(setupSettings.key, key),
      ),
    )
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(setupSettings)
      .set({ value: value as Record<string, unknown>, updatedAt: new Date() })
      .where(
        and(
          eq(setupSettings.tenantSetupId, setupId),
          eq(setupSettings.key, key),
        ),
      )
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(setupSettings)
    .values({
      id: createId(),
      tenantSetupId: setupId,
      key,
      value: value as Record<string, unknown>,
    })
    .returning();

  return created;
}
