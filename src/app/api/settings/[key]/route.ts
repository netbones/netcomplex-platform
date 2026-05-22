import { NextResponse } from 'next/server';
import { db, settings, users } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { apiLogger } from '@shared/lib';

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

  const { tenantId } = await withTenant();

  const result = await db
    .select()
    .from(settings)
    .where(and(eq(settings.tenantId, tenantId), eq(settings.key, settingKey)))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ key: settingKey, value: null });
  }

  return NextResponse.json({ key: result[0].key, value: result[0].value });
}

/**
 * PATCH /api/settings/[key] — Upsert a setting value for the current tenant.
 * Requires auth + admin permission.
 * Body: { value: string } — the setting value (typically JSON string for complex configs)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!hasPermission(authData.role, 'admin')) {
    return NextResponse.json(
      { error: 'Not authorised — admin permission required' },
      { status: 403 }
    );
  }

  const { key } = await params;
  const { tenantId } = await withTenant();
  const body = await request.json();

  if (body.value === undefined || body.value === null) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 });
  }

  const value = typeof body.value === 'string' ? body.value : JSON.stringify(body.value);

  try {
    // Check if setting exists
    const existing = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, key)))
      .limit(1);

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

    return NextResponse.json({ key, value });
  } catch (error) {
    apiLogger.error({ err: error, key, tenantId }, 'Settings upsert error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
