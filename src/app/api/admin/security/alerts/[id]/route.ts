import { NextRequest } from 'next/server';
import { db, apiSuccess, apiError, withErrorHandler, now } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { securityAlerts } from '@/db/schema/security-alerts';
import { alertStatusActionSchema } from '@entities/security';
import { and, eq } from 'drizzle-orm';

export const maxDuration = 8;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withErrorHandler(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth(request, { permission: 'admin' });
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { id } = await context.params;
  const { tenantId } = await withTenant();
  const body = await request.json();
  const parsed = alertStatusActionSchema.safeParse(body?.action);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'action must be acknowledge, responding, or resolve', 400);
  }

  const [existing] = await db
    .select()
    .from(securityAlerts)
    .where(and(eq(securityAlerts.id, id), eq(securityAlerts.tenantId, tenantId)))
    .limit(1);

  if (!existing) return apiError('NOT_FOUND', 'Alert not found', 404);

  const action = parsed.data;
  const ts = now();

  if (action === 'acknowledge') {
    if (!['SENT', 'FAILED'].includes(existing.status)) {
      return apiError('CONFLICT', 'Alert cannot be acknowledged in its current state', 409);
    }
    await db
      .update(securityAlerts)
      .set({
        status: 'ACKNOWLEDGED',
        acknowledgedAt: ts,
        acknowledgedByUserId: auth.data.userId,
        updatedAt: ts,
      })
      .where(eq(securityAlerts.id, id));
  } else if (action === 'responding') {
    if (existing.status !== 'ACKNOWLEDGED') {
      return apiError('CONFLICT', 'Mark responding is only available after acknowledge', 409);
    }
    await db
      .update(securityAlerts)
      .set({ status: 'RESPONDING', updatedAt: ts })
      .where(eq(securityAlerts.id, id));
  } else if (action === 'resolve') {
    if (!['ACKNOWLEDGED', 'RESPONDING', 'SENT'].includes(existing.status)) {
      return apiError('CONFLICT', 'Alert cannot be resolved in its current state', 409);
    }
    await db
      .update(securityAlerts)
      .set({
        status: 'RESOLVED',
        resolvedAt: ts,
        resolvedByUserId: auth.data.userId,
        updatedAt: ts,
      })
      .where(eq(securityAlerts.id, id));
  }

  const [updated] = await db
    .select()
    .from(securityAlerts)
    .where(eq(securityAlerts.id, id))
    .limit(1);
  return apiSuccess(updated);
});
