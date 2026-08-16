import { db, tenants, apiSuccess, withErrorHandler } from '@api/server';
import { asc, eq } from 'drizzle-orm';

export const maxDuration = 8;

/**
 * GET /api/join-requests/tenants
 * Public, unauthenticated tenant list for the join-request wizard's
 * community lookup step. Returns only the fields needed to display and
 * resolve a community — no billing or platform data.
 */
export const GET = withErrorHandler(async () => {
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
    })
    .from(tenants)
    .where(eq(tenants.active, true))
    .orderBy(asc(tenants.name));

  return apiSuccess(rows);
});
