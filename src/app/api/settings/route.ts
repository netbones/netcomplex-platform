import {
  db,
  settings,
  apiError,
  apiForbidden,
  apiUnauthorized,
  apiSuccess,
  writeAuditLog,
  rateLimitByUser,
  withErrorHandler,
  revalidateAdminChanges,
  getSessionAndRole,
  guardSuspension,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and } from 'drizzle-orm';
import { assertModuleEnabled, withTenant, requireAssistScope } from '@entities/tenant/server';
import { validateSettingValue } from '@shared/lib/settings/validation';

export const maxDuration = 8;

/**
 * @deprecated Use trpc.settings.listSettings instead.
 */
export const GET = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();
  const guard = guardSuspension(authData);
  if (guard) return guard;
  if (!hasPermission(authData.role, 'admin')) return apiForbidden();

  const moduleCheck = await assertModuleEnabled('settings');
  if (moduleCheck) return moduleCheck;

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  const { tenantId } = await withTenant();

  if (!key) {
    const allSettings = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
    return apiSuccess(allSettings);
  }

  const settingResult = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, key)))
    .limit(1);

  return apiSuccess(settingResult[0] || { key, value: null });
});

/**
 * @deprecated Use trpc.settings.upsertSetting instead.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();
  const guard = guardSuspension(authData);
  if (guard) return guard;
  if (!hasPermission(authData.role, 'admin')) return apiForbidden();

  const moduleCheck = await assertModuleEnabled('settings');
  if (moduleCheck) return moduleCheck;

  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  const rateLimit = await rateLimitByUser(authData.userId, { windowMs: 60_000, maxRequests: 10 });
  if (rateLimit) return rateLimit;

  interface SettingBody {
    key: string;
    value: string;
    type?: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  }

  const body = (await request.json()) as SettingBody;

  const validation = validateSettingValue(body.key, body.value);
  if (!validation.valid) {
    return apiError('VALIDATION_ERROR', validation.error!, 400);
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Try to update first, then insert if not found
  const existing = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, body.key)))
    .limit(1);

  const oldValue = existing[0]?.value ?? null;

  const setType = (body.type ?? 'STRING') as 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';

  if (existing[0]) {
    const updated = await db
      .update(settings)
      .set({ value: body.value, type: setType })
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, body.key)))
      .returning();

    writeAuditLog({
      action: 'SETTINGS_CHANGED',
      actorId: authData.userId,
      tenantId,
      details: { key: body.key, oldValue, newValue: body.value, method: 'POST' },
    });

    revalidateAdminChanges();
    return apiSuccess(updated[0]);
  } else {
    // Generate ID for new setting
    const newId = body.key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const created = await db
      .insert(settings)
      .values({ id: newId, tenantId, key: body.key, value: body.value, type: setType })
      .returning();

    writeAuditLog({
      action: 'SETTINGS_CHANGED',
      actorId: authData.userId,
      tenantId,
      details: { key: body.key, oldValue: null, newValue: body.value, method: 'POST' },
    });

    revalidateAdminChanges();
    return apiSuccess(created[0]);
  }
});
