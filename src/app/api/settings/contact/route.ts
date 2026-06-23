import {
  db,
  settings,
  apiSuccess,
  apiUnauthorized,
  getSessionAndRole,
  withErrorHandler,
} from '@api/server';

import { eq, sql } from 'drizzle-orm';
import { withTenant, withTenantOptional } from '@entities/tenant/server';

export const maxDuration = 8;

export const GET = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();
  // Allow reading settings without tenant (for public access)
  const { tenantId } = await withTenantOptional();

  if (!tenantId) {
    return apiSuccess({});
  }

  const contactSettings = await db.select().from(settings).where(eq(settings.tenantId, tenantId));

  const settingsMap = contactSettings.reduce(
    (acc, s) => {
      acc[s.key] = s.value;
      return acc;
    },
    {} as Record<string, string>
  );

  return apiSuccess(settingsMap);
});

export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData) return apiUnauthorized();

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
  }

  return apiSuccess({ success: true });
});
