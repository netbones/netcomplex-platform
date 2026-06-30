import {
  auth,
  db,
  resources,
  resourceVersions,
  users,
  revalidateContent,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  notDeleted,
  apiGone,
  now,
  withErrorHandler,
} from '@api/server';

import { eq, desc, and } from 'drizzle-orm';

import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/**
 * Retrieves session and role from the request for API routes.
 */
async function getSessionAndRole(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return null;
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return {
    session,
    userId: session.user.id,
    role: user?.role || 'RESIDENT',
  };
}

/**
 * Checks if a user owns any property in the tenant.
 */
async function checkUserOwnsProperty(userId: string, tenantId: string): Promise<boolean> {
  const { households, profiles } = await import('@api/server');
  const result = await db
    .select({ id: households.id })
    .from(households)
    .innerJoin(profiles, eq(profiles.householdId, households.id))
    .where(and(eq(households.tenantId, tenantId), eq(profiles.userId, userId)))
    .limit(1);
  return result.length > 0;
}

/**
 * GET /api/resources/[id] - Read single resource with visibility check
 */
export const GET = withErrorHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authData = await getSessionAndRole(_request);
    const role = authData?.role || null;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Check ownership for RESIDENT role
    let isOwner = false;
    if (authData?.userId) {
      isOwner = await checkUserOwnsProperty(authData.userId, tenantId);
    }

    // Fetch the resource
    const [resourceItem] = await db
      .select()
      .from(resources)
      .where(and(notDeleted(resources), eq(resources.id, id), eq(resources.tenantId, tenantId)));

    if (!resourceItem) {
      return apiNotFound('Resource not found');
    }

    // Apply visibility enforcement
    const visibility = resourceItem.visibility;

    // ADMIN/MANAGER/BOARD: see all
    if (hasPermission(role, 'admin') || role === 'MANAGER' || role === 'BOARD') {
      const versions = await db
        .select()
        .from(resourceVersions)
        .where(eq(resourceVersions.resourceId, id))
        .orderBy(desc(resourceVersions.createdAt));
      return apiSuccess({ ...resourceItem, versions });
    }

    // COMMITTEE: cannot see BOARD_ONLY
    if (role === 'COMMITTEE' && visibility === 'BOARD_ONLY') {
      return apiForbidden();
    }

    // RESIDENT (owner): cannot see BOARD_ONLY or COMMITTEE_ONLY
    if (role === 'RESIDENT' && isOwner) {
      if (visibility === 'BOARD_ONLY' || visibility === 'COMMITTEE_ONLY') {
        return apiForbidden();
      }
      const versions = await db
        .select()
        .from(resourceVersions)
        .where(eq(resourceVersions.resourceId, id))
        .orderBy(desc(resourceVersions.createdAt));
      return apiSuccess({ ...resourceItem, versions });
    }

    // RESIDENT (non-owner) or unauthenticated: only ALL_RESIDENTS
    if (visibility !== 'ALL_RESIDENTS') {
      return apiForbidden();
    }

    const versions = await db
      .select()
      .from(resourceVersions)
      .where(eq(resourceVersions.resourceId, id))
      .orderBy(desc(resourceVersions.createdAt));
    return apiSuccess({ ...resourceItem, versions });
  }
);

/**
 * PATCH /api/resources/[id] - Update resource
 * Requires ADMIN/MANAGER role.
 */
export const PATCH = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authData = await getSessionAndRole(request);

    if (!authData) {
      return apiUnauthorized();
    }

    if (!hasPermission(authData.role, 'content')) {
      return apiForbidden();
    }

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const body = await request.json();

    // Verify resource exists and belongs to tenant
    const [existing] = await db
      .select()
      .from(resources)
      .where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)));

    if (!existing) {
      return apiNotFound('Resource not found');
    }

    if (existing.deletedAt) {
      return apiGone('This record has been deleted');
    }

    // Save version history if file or version changed
    if (body.fileUrl || body.version) {
      const oldFileUrl = body.fileUrl ? existing.fileUrl : undefined;
      const oldVersion = body.version ? existing.version : undefined;
      if (oldFileUrl || oldVersion) {
        await db.insert(resourceVersions).values({
          id: createId(),
          resourceId: id,
          fileUrl: oldFileUrl,
          fileType: body.fileUrl ? existing.fileType : undefined,
          fileSize: body.fileUrl ? existing.fileSize : undefined,
          version: oldVersion,
          notes: body.versionNotes || null,
          createdAt: now(),
        });
      }
    }

    const [updated] = await db
      .update(resources)
      .set({
        ...body,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
        updatedAt: now(),
      })
      .where(eq(resources.id, id))
      .returning();

    revalidateContent();

    return apiSuccess(updated);
  }
);

/**
 * DELETE /api/resources/[id] - Delete resource
 * Requires ADMIN role.
 */
export const DELETE = withErrorHandler(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const authData = await getSessionAndRole(request);

    if (!authData) {
      return apiUnauthorized();
    }

    if (!hasPermission(authData.role, 'admin')) {
      return apiForbidden();
    }

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Verify resource exists and belongs to tenant
    const [existing] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)));

    if (!existing) {
      return apiNotFound('Resource not found');
    }

    await db
      .update(resources)
      .set({ deletedAt: now(), updatedAt: now() })
      .where(eq(resources.id, id));

    revalidateContent();

    return apiSuccess({ success: true });
  }
);
