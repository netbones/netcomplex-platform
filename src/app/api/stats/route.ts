import { db, users, groups, contents } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';

import { apiError, apiSuccess } from '@api/api-response';
// Fast stats endpoint - limit to 3 seconds
export const maxDuration = 3;

export async function GET() {
  const { tenantId } = await withTenant();

  // Count active users
  const activeUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isActive, true), eq(users.tenantId, tenantId)));
  const userCount = activeUsers.length;

  // Count active groups
  const activeGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.isActive, true), eq(groups.tenantId, tenantId)));
  const groupCount = activeGroups.length;

  // Count conservation content (using raw category value)
  const conservationContent = await db
    .select({ id: contents.id })
    .from(contents)
    .where(and(eq(contents.category, 'CONSERVATION'), eq(contents.tenantId, tenantId)));
  const contentCount = conservationContent.length;

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
}
