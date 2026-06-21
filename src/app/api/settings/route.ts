import {
  auth,
  db,
  users,
  settings,
  apiError,
  apiForbidden,
  apiSuccess,
  writeAuditLog,
  rateLimitByUser,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and } from 'drizzle-orm';
import { withTenant, requireAssistScope } from '@entities/tenant/server';
import { validateSettingValue } from '@shared/lib/settings/validation';

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const userResult = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult[0]?.role || 'RESIDENT',
  };
}

export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'admin')) {
    return apiForbidden();
  }

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
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'admin')) {
    return apiForbidden();
  }

  const scopeError = await requireAssistScope(request, 'full');
  if (scopeError) return scopeError;

  const rateLimit = await rateLimitByUser(authData.userId, { windowMs: 60_000, maxRequests: 10 });
  if (rateLimit) return rateLimit;

  interface SettingBody {
    key: string;
    value: string;
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

  if (existing[0]) {
    const updated = await db
      .update(settings)
      .set({ value: body.value })
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, body.key)))
      .returning();

    writeAuditLog({
      action: 'SETTINGS_CHANGED',
      actorId: authData.userId,
      tenantId,
      details: { key: body.key, oldValue, newValue: body.value, method: 'POST' },
    });

    return apiSuccess(updated[0]);
  } else {
    // Generate ID for new setting
    const newId = body.key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const created = await db
      .insert(settings)
      .values({ id: newId, tenantId, key: body.key, value: body.value })
      .returning();

    writeAuditLog({
      action: 'SETTINGS_CHANGED',
      actorId: authData.userId,
      tenantId,
      details: { key: body.key, oldValue: null, newValue: body.value, method: 'POST' },
    });

    return apiSuccess(created[0]);
  }
}
