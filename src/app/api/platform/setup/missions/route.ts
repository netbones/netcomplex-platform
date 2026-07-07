import {
  db,
  tenants,
  tenantSetups,
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiValidationError,
  auth,
  withErrorHandler,
} from '@api/server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { upsertMission } from '@/entities/setup';

export const maxDuration = 8;

const patchBodySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  missionKey: z.string().min(1, 'missionKey is required'),
  isCompleted: z.boolean(),
});

/**
 * PATCH /api/platform/setup/missions
 *
 * Toggle a mission's completion status and recalculate overall progress.
 * Tenant-scoped auth: caller must be the tenant owner.
 */
export const PATCH = withErrorHandler(async (request: Request) => {
  // Authenticate
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return apiError('AUTH_REQUIRED', 'Authentication required', 401);
  }

  // Parse & validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Invalid JSON body', 400);
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.message);
  }

  const { tenantId, missionKey, isCompleted } = parsed.data;

  // Tenant-scoped auth: user must be the tenant owner
  const tenant = await db
    .select({ ownerId: tenants.ownerId })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant[0]) {
    return apiNotFound('Tenant not found');
  }

  if (session.user.id !== tenant[0].ownerId) {
    return apiForbidden('You do not have access to this tenant');
  }

  // Find the TenantSetup for this tenant
  const setups = await db
    .select({ id: tenantSetups.id })
    .from(tenantSetups)
    .where(eq(tenantSetups.tenantId, tenantId))
    .limit(1);

  if (!setups[0]) {
    return apiNotFound('Setup not found for this tenant');
  }

  const result = await upsertMission(setups[0].id, missionKey, { isCompleted });

  if (!result.mission) {
    return apiNotFound(`Mission "${missionKey}" not found`);
  }

  return apiSuccess({
    mission: result.mission,
    completionPercent: result.completionPercent,
  });
});
