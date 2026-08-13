import { NextRequest } from 'next/server';
import { db, apiSuccess, apiError, apiInternalError, withErrorHandler } from '@api/server';
import { requireAuth } from '@/shared/api/auth-utils';
import { withTenant, assertModuleEnabled } from '@entities/tenant/server';
import { securityAlerts } from '@/db/schema/security-alerts';
import { anonymousTipSchema } from '@entities/security';
import { createId } from '@shared/lib/id';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('security-tips-api');

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const moduleGate = await assertModuleEnabled('security');
  if (moduleGate) return moduleGate;

  const { tenantId } = await withTenant();
  const body = await request.json();
  const parsed = anonymousTipSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid tip payload', 400, parsed.error.flatten());
  }

  const id = createId();
  const now = new Date();

  try {
    await db.insert(securityAlerts).values({
      id,
      tenantId,
      propertyId: null,
      triggeredByUserId: auth.data.userId,
      alertType: 'ANONYMOUS_TIP',
      latitude: null,
      longitude: null,
      locationAccuracyM: null,
      withinBoundary: null,
      message: parsed.data.message.trim(),
      status: 'SENT',
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    log.error({ operation: 'POST' }, 'Failed to create anonymous tip', error);
    return apiInternalError('Failed to submit tip');
  }

  return apiSuccess({ success: true, id }, undefined, 201);
});
