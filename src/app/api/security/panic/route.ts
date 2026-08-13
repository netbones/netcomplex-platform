import { NextRequest } from 'next/server';
import { db, apiSuccess, apiError, apiInternalError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { securityAlerts } from '@/db/schema/security-alerts';
import { securityContacts } from '@/db/schema/security-contacts';
import { standardSeats } from '@/db/schema/standard-seats';
import { panicAlertSchema } from '@entities/security';
import { dispatchPanicAlert } from '@entities/security/server';
import { createId } from '@shared/lib/id';
import { createComponentLogger } from '@shared/lib';
import { and, eq } from 'drizzle-orm';

export const maxDuration = 8;

const log = createComponentLogger('security-panic-api');

async function resolvePropertyId(tenantId: string, userId: string): Promise<string | null> {
  const [seat] = await db
    .select({ propertyId: standardSeats.propertyId })
    .from(standardSeats)
    .where(and(eq(standardSeats.tenantId, tenantId), eq(standardSeats.userId, userId)))
    .limit(1);
  return seat?.propertyId ?? null;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const body = await request.json();
  const parsed = panicAlertSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid panic payload', 400, parsed.error.flatten());
  }

  const propertyId = await resolvePropertyId(tenantId, auth.data.userId);
  const id = createId();
  const now = new Date();

  try {
    await db.insert(securityAlerts).values({
      id,
      tenantId,
      propertyId,
      triggeredByUserId: auth.data.userId,
      alertType: 'PANIC',
      latitude: parsed.data.latitude != null ? String(parsed.data.latitude) : null,
      longitude: parsed.data.longitude != null ? String(parsed.data.longitude) : null,
      locationAccuracyM:
        parsed.data.locationAccuracyM != null ? String(parsed.data.locationAccuracyM) : null,
      withinBoundary: null,
      message: null,
      status: 'SENT',
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    log.error({ operation: 'POST' }, 'Failed to create panic alert', error);
    return apiInternalError('Failed to create panic alert');
  }

  const [defaultContact] = await db
    .select({ phone: securityContacts.phone })
    .from(securityContacts)
    .where(
      and(eq(securityContacts.tenantId, tenantId), eq(securityContacts.isDefaultCallTarget, true))
    )
    .limit(1);

  const dispatch = await dispatchPanicAlert({
    tenantId,
    alertId: id,
    defaultContactPhone: defaultContact?.phone ?? null,
  });

  if (!dispatch.success) {
    await db
      .update(securityAlerts)
      .set({ status: 'FAILED', updatedAt: new Date() })
      .where(eq(securityAlerts.id, id));

    return apiError('DISPATCH_FAILED', dispatch.errorMessage ?? 'Dispatch failed', 503, {
      alertId: id,
      status: 'FAILED',
    });
  }

  const [alert] = await db.select().from(securityAlerts).where(eq(securityAlerts.id, id)).limit(1);
  return apiSuccess(
    {
      alert: alert
        ? {
            id: alert.id,
            status: alert.status,
            createdAt: alert.createdAt,
          }
        : { id, status: 'SENT' as const },
      dispatch,
    },
    undefined,
    201
  );
});
