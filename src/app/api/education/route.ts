import {
  auth,
  db,
  settings,
  users,
  apiSuccess,
  apiError,
  apiForbidden,
  now,
  withErrorHandler,
} from '@api/server';

import { eq } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

const EDUCATION_DEFAULTS = {
  bursaries: [],
  resources: [],
};

export const GET = withErrorHandler(async () => {
  const { tenantId } = await withTenant();

  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, tenantId))
    .then(rows => rows.find(s => s.key === 'education_data'));

  if (existing?.value) {
    try {
      const data = JSON.parse(existing.value);
      return apiSuccess(data);
    } catch {
      /* fall through to defaults */
    }
  }

  return apiSuccess(EDUCATION_DEFAULTS);
});

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

export const PUT = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'admin')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const body = await request.json();

  // Validate structure
  if (!body.bursaries || !Array.isArray(body.bursaries)) {
    return apiError('VALIDATION_ERROR', 'Invalid or missing bursaries array', 400);
  }
  if (!body.resources || !Array.isArray(body.resources)) {
    return apiError('VALIDATION_ERROR', 'Invalid or missing resources array', 400);
  }

  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, tenantId))
    .then(rows => rows.find(s => s.key === 'education_data'));

  const ts = now();
  const data = JSON.stringify({ bursaries: body.bursaries, resources: body.resources });

  if (existing) {
    await db
      .update(settings)
      .set({ value: data, updatedAt: ts })
      .where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({
      id: createId(),
      tenantId,
      key: 'education_data',
      value: data,
      schemaVersion: 1,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  return apiSuccess({ bursaries: body.bursaries, resources: body.resources });
});
