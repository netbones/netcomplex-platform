import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { db, users, settings } from '@api/db';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';

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

  if (!authData || !hasPermission(authData.role, 'settings')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    const allSettings = await db.select().from(settings);
    return NextResponse.json(allSettings);
  }

  const settingResult = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

  return NextResponse.json(settingResult[0] || { key, value: null });
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'settings')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  interface SettingBody {
    key: string;
    value: string;
  }

  const body = (await request.json()) as SettingBody;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Try to update first, then insert if not found
  const existing = await db.select().from(settings).where(eq(settings.key, body.key)).limit(1);

  if (existing[0]) {
    const updated = await db
      .update(settings)
      .set({ value: body.value })
      .where(eq(settings.key, body.key))
      .returning();
    return NextResponse.json(updated[0]);
  } else {
    // Generate ID for new setting
    const newId = body.key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const created = await db
      .insert(settings)
      .values({ id: newId, tenantId, key: body.key, value: body.value })
      .returning();
    return NextResponse.json(created[0]);
  }
}
