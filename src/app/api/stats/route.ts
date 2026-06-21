import {
  db,
  users,
  groups,
  contents,
  settings,
  apiSuccess,
  notDeleted,
  withErrorHandler,
} from '@api/server';

import { count, eq, and, inArray } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { SETTINGS_KEYS } from '@entities/tenant/server';

const STAT_KEYS = [
  SETTINGS_KEYS.STATS_HOMES,
  SETTINGS_KEYS.STATS_YEARS,
  SETTINGS_KEYS.STATS_BIRD_SPECIES,
  SETTINGS_KEYS.STATS_NATIVE_PLANTS,
] as const;

// Fast stats endpoint - limit to 3 seconds
export const maxDuration = 3;

export const GET = withErrorHandler(async () => {
  const { tenantId } = await withTenant();

  const [{ count: userCount }] = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.isActive, true), eq(users.tenantId, tenantId)));

  const [{ count: groupCount }] = await db
    .select({ count: count() })
    .from(groups)
    .where(and(eq(groups.isActive, true), eq(groups.tenantId, tenantId), notDeleted(groups)));

  const [{ count: contentCount }] = await db
    .select({ count: count() })
    .from(contents)
    .where(
      and(
        eq(contents.category, 'CONSERVATION'),
        eq(contents.tenantId, tenantId),
        notDeleted(contents)
      )
    );

  const statEntries = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), inArray(settings.key, STAT_KEYS)));

  const statMap = Object.fromEntries(statEntries.map(s => [s.key, s.value]));

  const stats = {
    homes: parseInt(statMap[SETTINGS_KEYS.STATS_HOMES] ?? '180', 10),
    years: parseInt(statMap[SETTINGS_KEYS.STATS_YEARS] ?? '15', 10),
    birdSpecies: parseInt(statMap[SETTINGS_KEYS.STATS_BIRD_SPECIES] ?? '47', 10),
    nativePlants: parseInt(statMap[SETTINGS_KEYS.STATS_NATIVE_PLANTS] ?? '150', 10),
    residents: userCount,
    groups: groupCount,
    conservationArticles: contentCount,
  };

  return apiSuccess(stats);
});
