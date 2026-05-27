import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { db, externalSurveys, users } from '@api/db';
import { eq, and, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { withTenant } from '@entities/tenant/api/with-tenant';

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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tenantId } = await withTenant();

  const surveyList = await db
    .select()
    .from(externalSurveys)
    .where(eq(externalSurveys.tenantId, tenantId))
    .orderBy(desc(externalSurveys.createdAt));

  return NextResponse.json(surveyList);
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'content')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

  return NextResponse.json(survey, { status: 201 });
}

export async function PATCH(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'content')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

  return NextResponse.json(survey);
}

export async function DELETE(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'content')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tenantId } = await withTenant();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await db
    .delete(externalSurveys)
    .where(and(eq(externalSurveys.id, id), eq(externalSurveys.tenantId, tenantId)));

  return NextResponse.json({ success: true });
}
