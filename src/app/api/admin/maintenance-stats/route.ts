import { runWithRLS, getRLSContext, maintenanceRequests } from '@api/db';
import { eq, count, and, gte, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';

import { apiForbidden, apiSuccess, apiUnauthorized } from '@api/api-response';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const ctx = await getRLSContext(request);
  if (!ctx) return apiUnauthorized();
  if (!['BOARD', 'ADMIN'].includes(ctx.role)) {
    return apiForbidden();
  }

  return runWithRLS(ctx, async tx => {
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
      tx
        .select({ count: count() })
        .from(maintenanceRequests)
        .where(
          and(
            tenantFilter,
            sql`${maintenanceRequests.status} != 'COMPLETED'`,
            sql`${maintenanceRequests.status} != 'CANCELLED'`
          )
        ),
      tx
        .select({ count: count() })
        .from(maintenanceRequests)
        .where(and(tenantFilter, gte(maintenanceRequests.createdAt, startOfMonth))),
      tx
        .select({ count: count() })
        .from(maintenanceRequests)
        .where(
          and(
            tenantFilter,
            sql`${maintenanceRequests.status} = 'COMPLETED'`,
            sql`${maintenanceRequests.completedAt} >= ${startOfMonth}`
          )
        ),
      tx
        .select({ count: count() })
        .from(maintenanceRequests)
        .where(
          and(
            tenantFilter,
            sql`${maintenanceRequests.status} NOT IN ('COMPLETED', 'CANCELLED')`,
            sql`${maintenanceRequests.scheduledDate} < ${now}`
          )
        ),
      tx
        .select({ status: maintenanceRequests.status, count: count() })
        .from(maintenanceRequests)
        .where(tenantFilter)
        .groupBy(maintenanceRequests.status),
      tx
        .select({ priority: maintenanceRequests.priority, count: count() })
        .from(maintenanceRequests)
        .where(tenantFilter)
        .groupBy(maintenanceRequests.priority),
      tx
        .select({ category: maintenanceRequests.category, count: count() })
        .from(maintenanceRequests)
        .where(tenantFilter)
        .groupBy(maintenanceRequests.category),
      tx
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

    const trendResult = await tx
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
      // byStatus now includes all 7 statuses: SUBMITTED, ASSIGNED, SCHEDULED, IN_PROGRESS, PENDING_PARTS, COMPLETED, CANCELLED
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
  });
}
