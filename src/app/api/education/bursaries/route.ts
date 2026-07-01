import {
  auth,
  db,
  users,
  apiSuccess,
  apiCreated,
  apiError,
  apiForbidden,
  apiValidationError,
  withErrorHandler,
  bursaries,
  bursaryFields,
} from '@api/server';

import { eq, and, isNull, desc } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { v4 as uuidv4 } from 'uuid';
import { bursaryCreateSchema } from '@entities/education';

export const maxDuration = 8;

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

export const GET = withErrorHandler(async () => {
  const { tenantId } = await withTenant();

  const rows = await db
    .select()
    .from(bursaries)
    .where(and(eq(bursaries.tenantId, tenantId), isNull(bursaries.deletedAt)))
    .orderBy(desc(bursaries.deadline));

  return apiSuccess(rows);
});

export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  if (!authData || !hasPermission(authData.role, 'admin')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const body = await request.json();

  const parsed = bursaryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues);
  }

  const [field] = await db
    .select()
    .from(bursaryFields)
    .where(eq(bursaryFields.id, parsed.data.fieldId))
    .limit(1);

  if (!field) {
    return apiError('VALIDATION_ERROR', 'BursaryField not found', 404);
  }

  const id = uuidv4();
  const now = new Date();
  await db.insert(bursaries).values({
    id,
    tenantId,
    title: parsed.data.title,
    funder: parsed.data.funder,
    fieldId: parsed.data.fieldId,
    amount: parsed.data.amount,
    description: parsed.data.description,
    applyUrl: parsed.data.applyUrl ?? null,
    deadline: new Date(parsed.data.deadline),
    status: parsed.data.status ?? 'DRAFT',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  const [created] = await db.select().from(bursaries).where(eq(bursaries.id, id)).limit(1);
  return apiCreated(created);
});
