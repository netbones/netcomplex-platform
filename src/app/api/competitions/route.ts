import {
  apiCreated,
  apiForbidden,
  apiSuccess,
  apiUnauthorized,
  auth,
  competitions,
  db,
  emitEvent,
  notDeleted,
  now,
  revalidateContent,
  users,
  withErrorHandler,
} from '@api/server';

import { eq, and, desc, lte, gte } from 'drizzle-orm';

import { assertModuleEnabled, withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

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
 * GET /api/competitions - List all competitions for the tenant
 * Returns competitions ordered by startDate descending.
 * Query params:
 *   - status: filter by competition status
 *   - upcoming: if "true", filter to active competitions (startDate <= now AND endDate >= now)
 *               Unauthenticated access allowed — only returns ACTIVE status competitions
 */
export const GET = withErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const upcomingParam = url.searchParams.get('upcoming');

  // Allow unauthenticated access for upcoming filter only (public page use case)
  if (upcomingParam === 'true') {
    const { tenantId } = await withTenant();

    const ts = now();
    const query = db
      .select()
      .from(competitions)
      .where(
        and(
          eq(competitions.tenantId, tenantId),
          eq(competitions.status, 'ACTIVE'),
          lte(competitions.startDate, ts),
          gte(competitions.endDate, ts),
          notDeleted(competitions)
        )
      )
      .orderBy(desc(competitions.startDate));

    const competitionItems = await query;
    return apiSuccess(competitionItems);
  }

  // All other queries require authentication
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const statusParam = url.searchParams.get('status');

  const validStatuses = ['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED'] as const;
  type CompetitionStatus = (typeof validStatuses)[number];

  let competitionItems: (typeof competitions.$inferSelect)[];

  if (statusParam && validStatuses.includes(statusParam as CompetitionStatus)) {
    const query = db
      .select()
      .from(competitions)
      .where(
        and(
          eq(competitions.tenantId, tenantId),
          eq(competitions.status, statusParam as CompetitionStatus),
          notDeleted(competitions)
        )
      )
      .orderBy(desc(competitions.startDate));

    competitionItems = await query;
  } else {
    const query = db
      .select()
      .from(competitions)
      .where(and(eq(competitions.tenantId, tenantId), notDeleted(competitions)))
      .orderBy(desc(competitions.startDate));

    competitionItems = await query;
  }

  return apiSuccess(competitionItems);
});

/**
 * POST /api/competitions - Create a new competition
 * Validates required fields and creates competition with tenant isolation.
 */
export const POST = withErrorHandler(async (request: Request) => {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  const moduleCheck = await assertModuleEnabled('competitions');
  if (moduleCheck) return moduleCheck;

  if (!hasPermission(authData.role, 'content') && !hasPermission(authData.role, 'contentOwn')) {
    return apiForbidden();
  }

  const body = await request.json();

  // Validate required fields
  if (!body.title || !body.startDate || !body.endDate) {
    return apiSuccess(
      { error: 'Missing required fields: title, startDate, endDate' },
      { status: 400 }
    );
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const ts = now();

  const [competition] = await db
    .insert(competitions)
    .values({
      id: createId(),
      tenantId,
      title: body.title,
      description: body.description || null,
      rules: body.rules || null,
      prizeInfo: body.prizeInfo || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: 'DRAFT',
      entryCount: 0,
      image: body.image || null,
      createdAt: ts,
      updatedAt: ts,
    })
    .returning();

  // Revalidate content caches
  revalidateContent();

  emitEvent('competition.entered', {
    tenantId,
    userId: authData.userId,
    competitionId: competition.id,
  });

  return apiCreated(competition);
});
