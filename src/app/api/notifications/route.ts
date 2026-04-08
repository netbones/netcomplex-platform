import { auth } from '@/lib/auth';
import { db, notifications } from '@/lib/db';
import { NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { withTenant } from '@/lib/tenant/with-tenant';

async function getSessionAndUserId(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}

export async function GET(request: Request) {
  const { tenantId } = await withTenant();
  const userId = await getSessionAndUserId(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unread = searchParams.get('unread');

  const unreadOnly = unread === 'true';

  const results = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const filtered = unreadOnly ? results.filter(n => !n.read) : results;

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const { tenantId } = await withTenant();
  const userId = await getSessionAndUserId(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const newNotification = await db
    .insert(notifications)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      userId: body.userId || userId,
      title: body.title,
      message: body.message,
      type: (body.type || 'info') as 'info' | 'warning' | 'success' | 'error',
      link: body.link || '',
      read: false,
    })
    .returning();

  return NextResponse.json(newNotification[0], { status: 201 });
}

export async function PATCH(request: Request) {
  const { tenantId } = await withTenant();
  const userId = await getSessionAndUserId(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  if (body.all) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)));
  } else if (body.id) {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, body.id), eq(notifications.tenantId, tenantId)));
  }

  return NextResponse.json({ success: true });
}
