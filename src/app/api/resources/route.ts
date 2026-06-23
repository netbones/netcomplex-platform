import {
  auth,
  db,
  resources,
  users,
  revalidateContent,
  apiCreated,
  apiError,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  now,
  withErrorHandler,
} from '@api/server';

import { eq, and, desc, inArray, isNull } from 'drizzle-orm';

import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';

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
 * Build a Drizzle WHERE clause for resource visibility based on user role.
 * Returns the visibility filter condition that should be combined with tenantId.
 */
function buildVisibilityFilter(role: string | null | undefined, isOwner: boolean = false) {
  // ADMIN/MANAGER/BOARD: see all visibility levels
  if (hasPermission(role, 'admin') || role === 'MANAGER' || role === 'BOARD') {
    return undefined; // No visibility filter — see everything
  }

  // COMMITTEE: see ALL_RESIDENTS, OWNERS_ONLY, COMMITTEE_ONLY
  if (role === 'COMMITTEE') {
    return inArray(resources.visibility, ['ALL_RESIDENTS', 'OWNERS_ONLY', 'COMMITTEE_ONLY']);
  }

  // RESIDENT (owner): see ALL_RESIDENTS, OWNERS_ONLY
  if (role === 'RESIDENT' && isOwner) {
    return inArray(resources.visibility, ['ALL_RESIDENTS', 'OWNERS_ONLY']);
  }

  // RESIDENT (non-owner) or unauthenticated: see ALL_RESIDENTS only
  return eq(resources.visibility, 'ALL_RESIDENTS');
}

/**
 * GET /api/resources - List resources for the tenant with visibility filtering
 * Query params:
 *   - category: filter by ResourceCategory
 *   - visibility: admin-only filter by ResourceVisibility
 */
export const GET = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);
  const role = authData?.role || null;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const url = new URL(request.url);
  const categoryParam = url.searchParams.get('category');
  const visibilityParam = url.searchParams.get('visibility');

  // Check if user owns a property (for RESIDENT role visibility)
  let isOwner = false;
  if (authData?.userId) {
    isOwner = await checkUserOwnsProperty(authData.userId, tenantId);
  }

  const visibilityFilter = buildVisibilityFilter(role, isOwner);

  // Admin-only: allow explicit visibility filter
  let adminVisibilityFilter: ReturnType<typeof eq> | undefined;
  if (visibilityParam && hasPermission(role, 'content')) {
    adminVisibilityFilter = eq(resources.visibility, visibilityParam as never);
  }

  // Category filter
  const categoryFilter = categoryParam ? eq(resources.category, categoryParam as never) : undefined;

  // Build combined WHERE clause
  const conditions = [eq(resources.tenantId, tenantId), isNull(resources.deletedAt)];
  if (visibilityFilter) conditions.push(visibilityFilter);
  if (adminVisibilityFilter) conditions.push(adminVisibilityFilter);
  if (categoryFilter) conditions.push(categoryFilter);

  const resourceItems = await db
    .select()
    .from(resources)
    .where(and(...conditions))
    .orderBy(desc(resources.createdAt));

  return apiSuccess(resourceItems);
});

/**
 * POST /api/resources - Create a new resource
 * Requires ADMIN/MANAGER role. Sets tenantId from withTenant(), authorId from session.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'content')) {
    return apiForbidden();
  }

  const body = await request.json();

  // Validate required fields
  if (!body.title || !body.category) {
    return apiError('VALIDATION_ERROR', 'Missing required fields: title, category', 400);
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const ts = now();

  const [resource] = await db
    .insert(resources)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      title: body.title,
      description: body.description || null,
      category: body.category,
      fileUrl: body.fileUrl || null,
      fileType: body.fileType || null,
      fileSize: body.fileSize || null,
      externalUrl: body.externalUrl || null,
      bodyContent: body.bodyContent || null,
      version: body.version || null,
      visibility: body.visibility || 'ALL_RESIDENTS',
      authorId: authData.role === 'ADMIN' ? null : authData.userId,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();

  // Revalidate content caches
  revalidateContent();

  return apiCreated(resource);
});
