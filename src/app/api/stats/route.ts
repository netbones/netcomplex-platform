import {
  db,
  users,
  groups,
  contents,
  apiError,
  apiSuccess,
  notDeleted,
  withErrorHandler,
} from '@api/server';

import { count, eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

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

  const stats = {
    homes: 180,
    years: 15,
    birdSpecies: 47,
    nativePlants: 150,
    residents: userCount,
    groups: groupCount,
    conservationArticles: contentCount,
  };

  return apiSuccess(stats);
});
