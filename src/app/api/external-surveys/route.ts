import {
  auth,
  db,
  externalSurveys,
  users,
  apiCreated,
  apiError,
  apiForbidden,
  apiSuccess,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@/entities/tenant/api/with-tenant';

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: user[0]?.role || 'RESIDENT',
  };
}

export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'content')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();

  const surveyList = await db
    .select()
    .from(externalSurveys)
    .where(eq(externalSurveys.tenantId, tenantId))
    .orderBy(desc(externalSurveys.createdAt));

  return apiSuccess(surveyList);
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'content')) {
    return apiForbidden();
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const body = await request.json();
  const now = new Date();

  const [survey] = await db
    .insert(externalSurveys)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      name: body.name,
      provider: body.provider, // 'bitlabs', 'cpx-research', etc.
      externalId: body.externalId,
      embedUrl: body.embedUrl,
      isActive: body.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return apiCreated(survey);
}

export async function PATCH(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'content')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const body = await request.json();

  const [survey] = await db
    .update(externalSurveys)
    .set({
      name: body.name,
      isActive: body.isActive,
      updatedAt: new Date(),
    })
    .where(and(eq(externalSurveys.id, body.id), eq(externalSurveys.tenantId, tenantId)))
    .returning();

  return apiSuccess(survey);
}

export async function DELETE(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'content')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return apiError('VALIDATION_ERROR', 'ID required', 400);
  }

  await db
    .delete(externalSurveys)
    .where(and(eq(externalSurveys.id, id), eq(externalSurveys.tenantId, tenantId)));

  return apiSuccess({ success: true });
}
