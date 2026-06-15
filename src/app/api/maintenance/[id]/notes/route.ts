import {
  auth,
  db,
  requestNotes,
  users,
  maintenanceRequests,
  revalidateDashboard,
  apiSuccess,
  apiCreated,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiError,
} from '@api/server';

import { hasPermission } from '@shared/lib';

import { eq, desc, and } from 'drizzle-orm';

import { withTenant } from '@entities/tenant/server';

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
    return apiUnauthorized();
  }

  const canViewAll = hasPermission(authData.role, 'requests');

  // First verify the request belongs to this tenant
  const [mr] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!mr) {
    return apiNotFound('Not found');
  }

  // Admin sees all notes; residents see only non-internal notes
  // Fixed: previously returned 403 if ANY internal note existed (bug)
  const noteConditions = canViewAll
    ? eq(requestNotes.requestId, id)
    : and(eq(requestNotes.requestId, id), eq(requestNotes.isInternal, false));

  const notes = await db
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
    .where(noteConditions)
    .orderBy(desc(requestNotes.createdAt));

  return apiSuccess(notes);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { tenantId } = await withTenant();

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return apiUnauthorized();
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return apiForbidden();
  }

  // First verify the request belongs to this tenant
  const [mr] = await db
    .select()
    .from(maintenanceRequests)
    .where(and(eq(maintenanceRequests.id, id), eq(maintenanceRequests.tenantId, tenantId)))
    .limit(1);

  if (!mr) {
    return apiNotFound('Not found');
  }

  const body = await request.json();
  const { content, isInternal } = body;

  if (!content) {
    return apiError('VALIDATION_ERROR', 'Content is required', 400);
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

  return apiCreated(note[0]);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await params;

  const { tenantId } = await withTenant();

  const url = new URL(request.url);
  const noteId = url.searchParams.get('noteId');

  if (!noteId) {
    return apiError('VALIDATION_ERROR', 'noteId required', 400);
  }

  const authData = await getSessionAndRole(request);
  if (!authData) {
    return apiUnauthorized();
  }

  const canViewAll = hasPermission(authData.role, 'requests');
  if (!canViewAll) {
    return apiForbidden();
  }

  // Get the note to find the associated request
  const [note] = await db.select().from(requestNotes).where(eq(requestNotes.id, noteId)).limit(1);

  if (!note) {
    return apiNotFound('Not found');
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
    return apiNotFound('Not found');
  }

  await db.delete(requestNotes).where(eq(requestNotes.id, noteId));

  revalidateDashboard();

  return apiSuccess({ success: true });
}
