import { db, users, maintenanceRequests } from '@api/db';
import { auth } from '@api/auth';
import { eq, count, and, gte, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';

import { apiError, apiForbidden, apiSuccess, apiUnauthorized } from '@api/api-response';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return apiUnauthorized();
  }

  const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  if (!currentUser || !['BOARD', 'ADMIN'].includes(currentUser.role)) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const tenantFilter = eq(maintenanceRequests.tenantId, tenantId);

  const [
    totalOpenResult,
    totalThisMonthResult,
    completedThisMonthResult,
    overdueResult,
    byStatusResult,
    byPriorityResult,
    byCategoryResult,
    avgResolutionResult,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(
        and(
          tenantFilter,
          sql`${maintenanceRequests.status} != 'COMPLETED'`,
          sql`${maintenanceRequests.status} != 'CANCELLED'`
        )
      ),
    db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(tenantFilter, gte(maintenanceRequests.createdAt, startOfMonth))),
    db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(
        and(
          tenantFilter,
          sql`${maintenanceRequests.status} = 'COMPLETED'`,
          sql`${maintenanceRequests.completedAt} >= ${startOfMonth}`
        )
      ),
    db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(
        and(
          tenantFilter,
          sql`${maintenanceRequests.status} NOT IN ('COMPLETED', 'CANCELLED')`,
          sql`${maintenanceRequests.scheduledDate} < ${now}`
        )
      ),
    db
      .select({ status: maintenanceRequests.status, count: count() })
      .from(maintenanceRequests)
      .where(tenantFilter)
      .groupBy(maintenanceRequests.status),
    db
      .select({ priority: maintenanceRequests.priority, count: count() })
      .from(maintenanceRequests)
      .where(tenantFilter)
      .groupBy(maintenanceRequests.priority),
    db
      .select({ category: maintenanceRequests.category, count: count() })
      .from(maintenanceRequests)
      .where(tenantFilter)
      .groupBy(maintenanceRequests.category),
    db
      .select({
        avgDays:
          sql<number>`AVG(EXTRACT(EPOCH FROM(${maintenanceRequests.completedAt}) - ${maintenanceRequests.createdAt}) / 86400)`.as(
            'avgDays'
          ),
      })
      .from(maintenanceRequests)
      .where(
        and(
          tenantFilter,
          eq(maintenanceRequests.status, 'COMPLETED'),
          sql`${maintenanceRequests.completedAt} IS NOT NULL`
        )
      )
      .limit(1),
  ]);

  const trendResult = await db
    .select({
      month: sql<string>`TO_CHAR(${maintenanceRequests.createdAt}, 'YYYY-MM')`.as('month'),
      count: count(),
    })
    .from(maintenanceRequests)
    .where(
      and(
        tenantFilter,
        gte(maintenanceRequests.createdAt, new Date(now.getFullYear(), now.getMonth() - 11, 1))
      )
    )
    .groupBy(sql`TO_CHAR(${maintenanceRequests.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${maintenanceRequests.createdAt}, 'YYYY-MM')`);

  const response = {
    overview: {
      totalOpen: totalOpenResult[0]?.count || 0,
      submittedThisMonth: totalThisMonthResult[0]?.count || 0,
      completedThisMonth: completedThisMonthResult[0]?.count || 0,
      overdue: overdueResult[0]?.count || 0,
      avgResolutionDays: avgResolutionResult[0]?.avgDays
        ? Math.round(avgResolutionResult[0].avgDays * 10) / 10
        : 0,
    },
    byStatus: byStatusResult.map(r => ({ status: r.status, count: Number(r.count) })),
    byPriority: byPriorityResult.map(r => ({ priority: r.priority, count: Number(r.count) })),
    byCategory: byCategoryResult.map(r => ({ category: r.category, count: Number(r.count) })),
    trend: trendResult.map(r => ({ month: r.month, count: Number(r.count) })),
  };

  return apiSuccess(response, undefined, 200, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
