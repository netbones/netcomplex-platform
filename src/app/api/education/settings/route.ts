import {
  auth,
  db,
  users,
  settings,
  apiSuccess,
  apiForbidden,
  now,
  withErrorHandler,
} from '@api/server';

import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

const DEFAULTS = {
  pin: { title: '', sub: '', link: '', btn: 'Apply' },
  shelf: [] as Array<{ title: string; author: string; gutId: string; stripe: string }>,
};

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return null;

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return { userId: session.user.id, role: user?.role || 'RESIDENT' };
}

async function loadSettings(tenantId: string) {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, tenantId))
    .then(rows => rows.filter(s => s.key === 'education_settings'));

  if (row?.value) {
    try {
      return { ...DEFAULTS, ...JSON.parse(row.value) };
    } catch {
      return DEFAULTS;
    }
  }
  return DEFAULTS;
}

export const GET = withErrorHandler(async () => {
  const { tenantId } = await withTenant();
  const data = await loadSettings(tenantId);
  return apiSuccess(data);
});

export const PUT = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData || !hasPermission(authData.role, 'admin')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const body = await request.json();

  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, tenantId))
    .then(rows => rows.find(s => s.key === 'education_settings'));

  const ts = now();
  const value = JSON.stringify({
    pin: body.pin ?? DEFAULTS.pin,
    shelf: body.shelf ?? DEFAULTS.shelf,
  });

  if (existing) {
    await db.update(settings).set({ value, updatedAt: ts }).where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({
      id: createId(),
      tenantId,
      key: 'education_settings',
      value,
      schemaVersion: 1,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  return apiSuccess(body);
});
