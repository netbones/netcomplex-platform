import {
  db,
  tenants,
  tenantSetups,
  setupSettings,
  apiError,
  apiForbidden,
  apiNotFound,
  apiSuccess,
  apiValidationError,
  auth,
  withErrorHandler,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { upsertSetupSetting } from '@entities/setup/server';

export const maxDuration = 8;

const patchBodySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  key: z.string().min(1, 'Setting key is required'),
  value: z.unknown(),
});

/**
 * GET /api/platform/setup/settings?tenantId=<id>
 *
 * Returns all setup settings for a tenant as a keyed record.
 * Tenant-scoped auth: caller must be the tenant owner.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return apiError('VALIDATION_ERROR', 'tenantId query parameter is required', 400);
  }

  // Authenticate
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return apiError('AUTH_REQUIRED', 'Authentication required', 401);
  }

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

  // Fetch all settings
  const settings = await db
    .select()
    .from(setupSettings)
    .where(eq(setupSettings.tenantSetupId, setups[0].id));

  // Convert to keyed record
  const settingsMap: Record<string, unknown> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return apiSuccess({ settings: settingsMap });
});

/**
 * PATCH /api/platform/setup/settings
 *
 * Upserts a single setup setting.
 * Body: { tenantId, key, value }
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

  const { tenantId, key, value } = parsed.data;

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

  const setting = await upsertSetupSetting(setups[0].id, key, value);

  return apiSuccess({ setting });
});
