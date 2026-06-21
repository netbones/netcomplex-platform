import {
  runWithRLS,
  getRLSContext,
  maintenanceRequests,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  withErrorHandler,
} from '@api/server';

import { eq, count, and, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: Request) => {
  const ctx = await getRLSContext(request);
  if (!ctx) return apiUnauthorized();
  if (!['BOARD', 'ADMIN'].includes(ctx.role)) {
    return apiForbidden();
  }

  return runWithRLS(ctx, async tx => {
    const tenantId = ctx.tenantId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const tenantFilter = eq(maintenanceRequests.tenantId, tenantId);

    // Run queries sequentially — the transaction connection (single pg client)
    // cannot safely handle concurrent queries.
    const totalOpenResult = await tx
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(
        and(
          tenantFilter,
          sql`${maintenanceRequests.status} != 'COMPLETED'`,
          sql`${maintenanceRequests.status} != 'CANCELLED'`
        )
      );

    const totalThisMonthResult = await tx
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(and(tenantFilter, gte(maintenanceRequests.createdAt, startOfMonth)));

    const completedThisMonthResult = await tx
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(
        and(
          tenantFilter,
          sql`${maintenanceRequests.status} = 'COMPLETED'`,
          sql`${maintenanceRequests.completedAt} >= ${startOfMonth}`
        )
      );

    const overdueResult = await tx
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(
        and(
          tenantFilter,
          sql`${maintenanceRequests.status} NOT IN ('COMPLETED', 'CANCELLED')`,
          sql`${maintenanceRequests.scheduledDate} < ${now}`
        )
      );

    const byStatusResult = await tx
      .select({ status: maintenanceRequests.status, count: count() })
      .from(maintenanceRequests)
      .where(tenantFilter)
      .groupBy(maintenanceRequests.status);

    const byPriorityResult = await tx
      .select({ priority: maintenanceRequests.priority, count: count() })
      .from(maintenanceRequests)
      .where(tenantFilter)
      .groupBy(maintenanceRequests.priority);

    const byCategoryResult = await tx
      .select({ category: maintenanceRequests.category, count: count() })
      .from(maintenanceRequests)
      .where(tenantFilter)
      .groupBy(maintenanceRequests.category);

    const avgResolutionResult = await tx
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
      .limit(1);

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
});
