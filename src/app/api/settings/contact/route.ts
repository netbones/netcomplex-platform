import {
  db,
  settings,
  apiSuccess,
  apiForbidden,
  apiUnauthorized,
  getSessionAndRole,
  withErrorHandler,
  writeAuditLog,
  revalidateAdminChanges,
  guardSuspension,
} from '@api/server';

import { eq, sql, and } from 'drizzle-orm';
import { assertModuleEnabled, withTenant, withTenantOptional } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';

export const maxDuration = 8;

export const GET = withErrorHandler(async (_request: Request) => {
  const { tenantId } = await withTenantOptional();

  if (!tenantId) {
    return apiSuccess({});
  }

  const contactSettings = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, 'map.center')));
  const streetsSettings = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, 'map.streets')));

  const settingsMap: Record<string, string> = {};
  for (const s of [...contactSettings, ...streetsSettings]) {
    settingsMap[s.key] = s.value;
  }

  return apiSuccess(settingsMap);
});

export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();
  const guard = guardSuspension(authData);
  if (guard) return guard;

  if (!hasPermission(authData.role, 'admin')) return apiForbidden();

  const moduleCheck = await assertModuleEnabled('settings');
  if (moduleCheck) return moduleCheck;

  const { tenantId } = await withTenant();
  const body = await request.json();

  const entries = Object.entries(body).map(([key, value]) => ({
    id: key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
    tenantId,
    key,
    value: String(value),
  }));

  if (entries.length > 0) {
    await db
      .insert(settings)
      .values(entries)
      .onConflictDoUpdate({
        target: [settings.tenantId, settings.key],
        set: { value: sql`excluded.value` },
      });

    writeAuditLog({
      action: 'SETTINGS_CHANGED',
      actorId: authData.userId,
      tenantId,
      details: { keys: Object.keys(body), method: 'POST' },
    });
  }

  revalidateAdminChanges();
  return apiSuccess({ success: true });
});
