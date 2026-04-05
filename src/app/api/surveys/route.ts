import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { db, surveys, users } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant/with-tenant';

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

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const surveyList = status
    ? await db
        .select()
        .from(surveys)
        .where(eq(surveys.status, status as 'DRAFT' | 'ACTIVE' | 'CLOSED'))
        .orderBy(desc(surveys.createdAt))
    : await db.select().from(surveys).orderBy(desc(surveys.createdAt));

  return NextResponse.json(surveyList);
}

export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(authData.role, 'content')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const now = new Date();

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const [survey] = await db
    .insert(surveys)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      title: body.title,
      description: body.description ?? null,
      type: body.type ?? 'INTERNAL',
      status: body.status ?? 'DRAFT',
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(survey, { status: 201 });
}
