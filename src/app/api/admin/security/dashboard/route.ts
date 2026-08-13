import { NextRequest } from 'next/server';
import { db, apiSuccess, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { securityAlerts } from '@/db/schema/security-alerts';
import { users } from '@/db/schema/users';
import { properties } from '@/db/schema/properties';
import { and, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';

export const maxDuration = 8;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const today = startOfToday();
  const monthStart = startOfMonth();

  const liveStatuses = ['SENT', 'ACKNOWLEDGED', 'RESPONDING'] as const;

  const [activeRow] = await db
    .select({ n: count() })
    .from(securityAlerts)
    .where(
      and(
        eq(securityAlerts.tenantId, tenantId),
        eq(securityAlerts.alertType, 'PANIC'),
        inArray(securityAlerts.status, [...liveStatuses])
      )
    );

  const [todayRow] = await db
    .select({ n: count() })
    .from(securityAlerts)
    .where(
      and(
        eq(securityAlerts.tenantId, tenantId),
        eq(securityAlerts.alertType, 'PANIC'),
        gte(securityAlerts.createdAt, today)
      )
    );

  const [monthRow] = await db
    .select({ n: count() })
    .from(securityAlerts)
    .where(
      and(
        eq(securityAlerts.tenantId, tenantId),
        eq(securityAlerts.alertType, 'PANIC'),
        gte(securityAlerts.createdAt, monthStart)
      )
    );

  const avgResponse = await db
    .select({
      avgMs: sql<number>`avg(extract(epoch from (${securityAlerts.acknowledgedAt} - ${securityAlerts.createdAt})) * 1000)::float`,
    })
    .from(securityAlerts)
    .where(
      and(
        eq(securityAlerts.tenantId, tenantId),
        eq(securityAlerts.alertType, 'PANIC'),
        sql`${securityAlerts.acknowledgedAt} IS NOT NULL`
      )
    );

  const liveRows = await db
    .select({
      id: securityAlerts.id,
      alertType: securityAlerts.alertType,
      status: securityAlerts.status,
      createdAt: securityAlerts.createdAt,
      acknowledgedAt: securityAlerts.acknowledgedAt,
      latitude: securityAlerts.latitude,
      longitude: securityAlerts.longitude,
      withinBoundary: securityAlerts.withinBoundary,
      message: securityAlerts.message,
      residentName: users.name,
      propertyUnit: properties.unit,
      propertyStreet: properties.street,
    })
    .from(securityAlerts)
    .leftJoin(users, eq(securityAlerts.triggeredByUserId, users.id))
    .leftJoin(properties, eq(securityAlerts.propertyId, properties.id))
    .where(
      and(
        eq(securityAlerts.tenantId, tenantId),
        eq(securityAlerts.alertType, 'PANIC'),
        inArray(securityAlerts.status, [...liveStatuses])
      )
    )
    .orderBy(desc(securityAlerts.createdAt));

  const resolvedRows = await db
    .select({
      id: securityAlerts.id,
      alertType: securityAlerts.alertType,
      status: securityAlerts.status,
      createdAt: securityAlerts.createdAt,
      resolvedAt: securityAlerts.resolvedAt,
      residentName: users.name,
    })
    .from(securityAlerts)
    .leftJoin(users, eq(securityAlerts.triggeredByUserId, users.id))
    .where(
      and(
        eq(securityAlerts.tenantId, tenantId),
        eq(securityAlerts.alertType, 'PANIC'),
        eq(securityAlerts.status, 'RESOLVED')
      )
    )
    .orderBy(desc(securityAlerts.resolvedAt))
    .limit(50);

  const tipRows = await db
    .select({
      id: securityAlerts.id,
      message: securityAlerts.message,
      createdAt: securityAlerts.createdAt,
      status: securityAlerts.status,
    })
    .from(securityAlerts)
    .where(
      and(eq(securityAlerts.tenantId, tenantId), eq(securityAlerts.alertType, 'ANONYMOUS_TIP'))
    )
    .orderBy(desc(securityAlerts.createdAt))
    .limit(50);

  const avgMs = avgResponse[0]?.avgMs;
  const avgResponseMinutes =
    avgMs != null && Number.isFinite(avgMs) ? Math.round(avgMs / 60000) : null;

  return apiSuccess({
    stats: {
      activeNow: activeRow?.n ?? 0,
      today: todayRow?.n ?? 0,
      avgResponseMinutes,
      monthTotal: monthRow?.n ?? 0,
    },
    live: liveRows.map(row => ({
      ...row,
      residentName: row.alertType === 'ANONYMOUS_TIP' ? null : row.residentName,
    })),
    resolved: resolvedRows.map(row => ({
      ...row,
      residentName: row.alertType === 'ANONYMOUS_TIP' ? null : row.residentName,
    })),
    tips: tipRows,
  });
});
