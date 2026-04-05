import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { db, requestHistories, users } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { revalidateDashboard } from '@/lib/revalidation';

async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const [userResult] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  return {
    session,
    userId: session.user.id,
    role: userResult?.role || 'RESIDENT',
  };
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const history = await db
    .select({
      id: requestHistories.id,
      requestId: requestHistories.requestId,
      field: requestHistories.field,
      oldValue: requestHistories.oldValue,
      newValue: requestHistories.newValue,
      comment: requestHistories.comment,
      createdAt: requestHistories.createdAt,
      user: {
        id: users.id,
        name: users.name,
      },
    })
    .from(requestHistories)
    .leftJoin(users, eq(requestHistories.userId, users.id))
    .where(eq(requestHistories.requestId, id))
    .orderBy(desc(requestHistories.createdAt));

  return NextResponse.json(history);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { field, oldValue, newValue, comment } = body;

  if (!field || newValue === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const historyEntry = await db
    .insert(requestHistories)
    .values({
      id: crypto.randomUUID(),
      requestId: id,
      userId: authData.userId,
      field,
      oldValue: oldValue || null,
      newValue: String(newValue),
      comment: comment || null,
    })
    .returning();

  revalidateDashboard();

  return NextResponse.json(historyEntry[0], { status: 201 });
}
