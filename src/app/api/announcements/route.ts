import {
  announcements,
  apiCreated,
  apiForbidden,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiValidationError,
  auth,
  db,
  notDeleted,
  notifications,
  now,
  profiles,
  resources,
  revalidateDashboard,
  users,
  withErrorHandler,
} from '@api/server';

import { eq, and, desc, inArray, isNull, sql } from 'drizzle-orm';

import { withTenant } from '@entities/tenant/server';
import { canPublishAnnouncements } from '@shared/lib';
import { validatePriorityForRole } from '@features/announcements';
import type { AnnouncementPriority } from '@features/announcements';
import { announcementSchema } from '@entities/content';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

/** Fanout batch size for processing notification inserts in chunks */
const FANOUT_BATCH = 500;

/**
 * Retrieves session and role from the request for API routes.
 * @param request - Incoming HTTP request
 * @returns Session data with user ID and role, or null if not authenticated
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
 * GET /api/announcements - List all announcements for the tenant
 * Returns announcements ordered by priority (urgent first) then createdAt descending.
 * Query params:
 * - priority: filter by priority level (urgent/high/normal/low)
 * - active: if "true", filter to non-expired announcements only
 * - limit: limit number of results (for widget queries)
 */
export const GET = withErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const priorityParam = url.searchParams.get('priority');
  const activeParam = url.searchParams.get('active');
  const limitParam = url.searchParams.get('limit');

  // Allow unauthenticated access for active announcements (public page use case)
  const isPublicQuery = activeParam === 'true';

  if (!isPublicQuery) {
    const authData = await getSessionAndRole(request);
    if (!authData) {
      return apiUnauthorized();
    }
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const validPriorities = ['urgent', 'high', 'normal', 'low'] as const;
  const nowDate = now();

  // Build conditions array
  const conditions = [eq(announcements.tenantId, tenantId), notDeleted(announcements)];

  if (priorityParam && validPriorities.includes(priorityParam as AnnouncementPriority)) {
    conditions.push(eq(announcements.priority, priorityParam));
  }

  if (activeParam === 'true') {
    // Active means: expiresAt is null OR expiresAt > now
    conditions.push(
      sql`(${announcements.expiresAt} IS NULL OR ${announcements.expiresAt} > ${nowDate})`
    );
  }

  // Order by priority (urgent first) then by createdAt desc
  // Use CASE to map priority strings to sort order
  const priorityOrder = sql`CASE ${announcements.priority}
    WHEN 'urgent' THEN 0
    WHEN 'high' THEN 1
    WHEN 'normal' THEN 2
    WHEN 'low' THEN 3
    ELSE 4 END`;

  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : undefined;

  const announcementItems = await db
    .select()
    .from(announcements)
    .where(and(...conditions))
    .orderBy(priorityOrder, desc(announcements.createdAt))
    .limit(limit ?? 50);

  return apiSuccess(announcementItems);
});

/**
 * POST /api/announcements - Create a new announcement with targeting + fanout + priority enforcement
 * Validates required fields, enforces priority role-gating, applies audience targeting,
 * and fans out Notification records to matching users.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!canPublishAnnouncements(authData.role)) {
    return apiForbidden('Insufficient permissions to publish announcements');
  }

  const body = await request.json();

  // Validate with Zod schema
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.flatten().fieldErrors);
  }

  const data = parsed.data;

  // PRIORITY ENFORCEMENT: Validate that the user's role permits the requested priority
  const validatedPriority = validatePriorityForRole(
    data.priority as AnnouncementPriority,
    authData.role
  );

  const priorityDowngraded = validatedPriority !== data.priority;

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // If resourceId is provided, verify the Resource exists AND belongs to the same tenant
  if (data.resourceId) {
    const [resource] = await db
      .select({ id: resources.id })
      .from(resources)
      .where(and(eq(resources.id, data.resourceId), eq(resources.tenantId, tenantId)))
      .limit(1);

    if (!resource) {
      return apiValidationError('Resource not found or does not belong to this tenant');
    }
  }

  const announcementDate = now();

  const [announcement] = await db
    .insert(announcements)
    .values({
      id: createId(),
      tenantId,
      title: data.title,
      content: data.content,
      author: data.author,
      priority: validatedPriority,
      targetFilter: data.targetFilter,
      targetRoles: data.targetRoles,
      resourceId: data.resourceId || null,
      createdAt: announcementDate,
      updatedAt: announcementDate,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    })
    .returning();

  if (!announcement) {
    return apiInternalError('Failed to create announcement');
  }

  // ─── NOTIFICATION FANOUT ───────────────────────────────────────────────────
  // Step 1: Fetch all active users for this tenant
  let targetUsers: { id: string }[] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)));

  // Step 2: Apply targetFilter (audience by residency type)
  if (data.targetFilter === 'OWNERS_ONLY') {
    const ownerUserIds = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.isActive, true),
          inArray(profiles.residencyType, ['OWNER', 'FAMILY'])
        )
      );
    targetUsers = ownerUserIds;
  } else if (data.targetFilter === 'RENTERS_ONLY') {
    const renterUserIds = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.isActive, true),
          eq(profiles.residencyType, 'RENTER')
        )
      );
    targetUsers = renterUserIds;
  }
  // ALL: no occupancy filter — keep all active users

  // Step 3: Apply targetRoles (if non-empty)
  if (data.targetRoles && data.targetRoles.length > 0) {
    const roleFilteredUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.isActive, true),
          inArray(users.role, data.targetRoles)
        )
      );
    // Intersect: user must match BOTH filter AND role
    const roleIds = new Set(roleFilteredUsers.map(u => u.id));
    targetUsers = targetUsers.filter(u => roleIds.has(u.id));
  }

  // Step 4: Bulk insert notifications in batches for all target users
  if (targetUsers.length > 0) {
    for (let i = 0; i < targetUsers.length; i += FANOUT_BATCH) {
      const batch = targetUsers.slice(i, i + FANOUT_BATCH);
      await db.insert(notifications).values(
        batch.map(user => ({
          id: createId(),
          tenantId,
          userId: user.id,
          title: announcement.title as string,
          message: announcement.content.slice(0, 200),
          type: 'info',
          link: `/news#announcement-${announcement.id}`,
          read: false,
        })) as (typeof notifications.$inferInsert)[]
      );
    }
  }

  // Revalidate dashboard caches
  revalidateDashboard();

  // Build response with optional priority downgrade warning
  const response: Record<string, unknown> = { ...announcement };
  if (priorityDowngraded) {
    response.warning = `Priority downgraded from ${data.priority} to ${validatedPriority} — your role permits a maximum of ${validatedPriority}`;
  }

  return apiCreated(response);
});
