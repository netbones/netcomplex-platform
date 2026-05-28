import { auth } from '@api/auth';
import { db, resources, users } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { revalidateContent } from '@api/revalidation';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { hasPermission } from '@entities/tenant/api/permissions';

import {
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
} from '@api/api-response';
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
  const { households, profiles } = await import('@api/db');
  const result = await db
    .select({ id: households.id })
    .from(households)
    .innerJoin(profiles, eq(profiles.householdId, households.id))
    .where(and(eq(households.tenantId, tenantId), eq(profiles.userId, userId)))
    .limit(1);
  return result.length > 0;
}

/**
 * Build a Drizzle WHERE clause for resource visibility based on user role.
 */
function buildVisibilityFilter(role: string | null | undefined, isOwner: boolean = false) {
  if (hasPermission(role, 'admin') || role === 'MANAGER' || role === 'BOARD') {
    return undefined;
  }

  if (role === 'COMMITTEE') {
    return eq(resources.visibility, 'ALL_RESIDENTS') ? undefined : undefined; // Simplified: we'll handle in query
  }

  if (role === 'RESIDENT' && isOwner) {
    return undefined; // Will filter in query
  }

  return eq(resources.visibility, 'ALL_RESIDENTS');
}

/**
 * GET /api/resources/[id] - Read single resource with visibility check
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    .where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)));

  if (!resourceItem) {
    return apiNotFound('Resource not found');
  }

  // Apply visibility enforcement
  const visibility = resourceItem.visibility;

  // ADMIN/MANAGER/BOARD: see all
  if (hasPermission(role, 'admin') || role === 'MANAGER' || role === 'BOARD') {
    return apiSuccess(resourceItem);
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
    return apiSuccess(resourceItem);
  }

  // RESIDENT (non-owner) or unauthenticated: only ALL_RESIDENTS
  if (visibility !== 'ALL_RESIDENTS') {
    return apiForbidden();
  }

  return apiSuccess(resourceItem);
}

/**
 * PATCH /api/resources/[id] - Update resource
 * Requires ADMIN/MANAGER role.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    .select({ id: resources.id })
    .from(resources)
    .where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)));

  if (!existing) {
    return apiNotFound('Resource not found');
  }

  const [updated] = await db
    .update(resources)
    .set({
      ...body,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(resources.id, id))
    .returning();

  revalidateContent();

  return apiSuccess(updated);
}

/**
 * DELETE /api/resources/[id] - Delete resource
 * Requires ADMIN role.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  await db.delete(resources).where(eq(resources.id, id));

  revalidateContent();

  return apiSuccess({ success: true });
}
