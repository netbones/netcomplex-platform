import {
  db,
  settings,
  users,
  auth,
  apiError,
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  writeAuditLog,
  rateLimitByUser,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';

import { hasPermission } from '@shared/lib';
import { requireAssistScope } from '@entities/tenant/server';
import { apiLogger } from '@shared/lib';
import { validateSettingValue } from '@shared/lib/settings/validation';

/**
 * Retrieves session and role from the request for API routes.
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const userResult = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult[0]?.role || 'RESIDENT',
  };
}

/**
 * GET /api/settings/[key] — Fetch a single setting by key for the current tenant.
 * Returns { key, value } or { key, value: null } if not found.
 * Supports optional ?key= query param as well (for convenience).
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { searchParams } = new URL(request.url);
  const queryKey = searchParams.get('key');
  const settingKey = key || queryKey;

  if (!settingKey) {
    return apiError('VALIDATION_ERROR', 'Setting key is required', 400);
  }

  const { tenantId } = await withTenant();

  const result = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, settingKey)))
    .limit(1);

  if (result.length === 0) {
    return apiSuccess({ key: settingKey, value: null });
  }

  return apiSuccess({ key: result[0].key, value: result[0].value });
}

/**
 * PATCH /api/settings/[key] — Upsert a setting value for the current tenant.
 * Requires auth + admin permission.
 * Body: { value: string } — the setting value (typically JSON string for complex configs)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'admin')) {
    return apiForbidden('admin permission required');
  }

  // AssistSession scope guard: metadata-scoped staff can only read, not modify content/users/settings
  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  const rateLimit = rateLimitByUser(authData.userId, { windowMs: 60_000, maxRequests: 10 });
  if (rateLimit) return rateLimit;

  const { key } = await params;
  const { tenantId } = await withTenant();
  const body = await request.json();

  if (body.value === undefined || body.value === null) {
    return apiError('VALIDATION_ERROR', 'value is required', 400);
  }

  const value = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);

  const validation = validateSettingValue(key, value);
  if (!validation.valid) {
    return apiError('VALIDATION_ERROR', validation.error!, 400);
  }

  try {
    // Check if setting exists
    const existing = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, key)))
      .limit(1);

    const oldValue = existing.length > 0 ? existing[0].value : null;

    if (existing.length > 0) {
      // Update existing
      await db
        .update(settings)
        .set({ value })
        .where(and(eq(settings.tenantId, tenantId), eq(settings.key, key)));
    } else {
      // Insert new
      const id = `${tenantId}_${key}`.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      await db.insert(settings).values({ id, tenantId, key, value });
    }

    writeAuditLog({
      action: 'SETTINGS_CHANGED',
      actorId: authData.userId,
      tenantId,
      details: { key, oldValue, newValue: value, method: 'PATCH' },
    });

    return apiSuccess({ key, value });
  } catch (error) {
    apiLogger.error({ err: error, key, tenantId }, 'Settings upsert error');
    return apiInternalError();
  }
}
