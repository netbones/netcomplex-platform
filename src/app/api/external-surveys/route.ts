import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { db, externalSurveys, users } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

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

  const surveyList = await db
    .select()
    .from(externalSurveys)
    .orderBy(desc(externalSurveys.createdAt));

  return NextResponse.json(surveyList);
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'content')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const now = new Date();

  const [survey] = await db
    .insert(externalSurveys)
    .values({
      id: crypto.randomUUID(),
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

  const body = await request.json();

  const [survey] = await db
    .update(externalSurveys)
    .set({
      name: body.name,
      isActive: body.isActive,
      updatedAt: new Date(),
    })
    .where(eq(externalSurveys.id, body.id))
    .returning();

  return NextResponse.json(survey);
}

export async function DELETE(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData || !hasPermission(authData.role, 'content')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await db.delete(externalSurveys).where(eq(externalSurveys.id, id));

  return NextResponse.json({ success: true });
}
