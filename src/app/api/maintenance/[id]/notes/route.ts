import { NextResponse } from 'next/server';
import { auth } from '@api/auth';
import { hasPermission } from '@entities/tenant/api/permissions';
import { db, requestNotes, users, maintenanceRequests } from '@api/db';
import { eq, desc, and } from 'drizzle-orm';
import { revalidateDashboard } from '@api/revalidation';
import { withTenant } from '@entities/tenant/api/with-tenant';

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

  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');

  // First verify the request belongs to this tenant
  const [mr] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!mr) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let notes;
  if (canViewAll) {
    notes = await db
      .select({
        id: requestNotes.id,
        requestId: requestNotes.requestId,
        content: requestNotes.content,
        isInternal: requestNotes.isInternal,
        createdAt: requestNotes.createdAt,
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(requestNotes)
      .leftJoin(users, eq(requestNotes.userId, users.id))
      .where(eq(requestNotes.requestId, id))
      .orderBy(desc(requestNotes.createdAt));
  } else {
    const [existing] = await db
      .select()
      .from(requestNotes)
      .where(and(eq(requestNotes.requestId, id), eq(requestNotes.isInternal, true)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    notes = await db
      .select({
        id: requestNotes.id,
        requestId: requestNotes.requestId,
        content: requestNotes.content,
        isInternal: requestNotes.isInternal,
        createdAt: requestNotes.createdAt,
        user: {
          id: users.id,
          name: users.name,
        },
      })
      .from(requestNotes)
      .leftJoin(users, eq(requestNotes.userId, users.id))
      .where(and(eq(requestNotes.requestId, id), eq(requestNotes.isInternal, false)))
      .orderBy(desc(requestNotes.createdAt));
  }

  return NextResponse.json(notes);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // First verify the request belongs to this tenant
  const [mr] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!mr) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { content, isInternal } = body;

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const note = await db
    .insert(requestNotes)
    .values({
      id: crypto.randomUUID(),
      requestId: id,
      userId: authData.userId,
      content,
      isInternal: isInternal !== false,
    })
    .returning();

  revalidateDashboard();

  return NextResponse.json(note[0], { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await params;

  const { tenantId } = await withTenant();

  const url = new URL(request.url);
  const noteId = url.searchParams.get('noteId');

  if (!noteId) {
    return NextResponse.json({ error: 'noteId required' }, { status: 400 });
  }

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get the note to find the associated request
  const [note] = await db.select().from(requestNotes).where(eq(requestNotes.id, noteId)).limit(1);

  if (!note) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Verify the request belongs to this tenant
  const [mr] = await db
    .select()
    .from(maintenanceRequests)
    .where(
      and(eq(maintenanceRequests.id, note.requestId), eq(maintenanceRequests.tenantId, tenantId))
    )
    .limit(1);

  if (!mr) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.delete(requestNotes).where(eq(requestNotes.id, noteId));

  revalidateDashboard();

  return NextResponse.json({ success: true });
}
