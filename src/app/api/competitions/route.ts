import { auth } from '@api/auth';
import { db, competitions, users } from '@api/db';
import { eq, and, desc, lte, gte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { revalidateContent } from '@api/revalidation';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { hasPermission } from '@entities/tenant/api/permissions';

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
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status');
  const upcomingParam = url.searchParams.get('upcoming');

  const validStatuses = ['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED'] as const;
  type CompetitionStatus = (typeof validStatuses)[number];

  let competitionItems: (typeof competitions.$inferSelect)[];

  if (upcomingParam === 'true') {
    const now = new Date();
    const query = db
      .select()
      .from(competitions)
      .where(
        and(
          eq(competitions.tenantId, tenantId),
          lte(competitions.startDate, now),
          gte(competitions.endDate, now)
        )
      )
      .orderBy(desc(competitions.startDate));

    competitionItems = await query;
  } else if (statusParam && validStatuses.includes(statusParam as CompetitionStatus)) {
    const query = db
      .select()
      .from(competitions)
      .where(
        and(
          eq(competitions.tenantId, tenantId),
          eq(competitions.status, statusParam as CompetitionStatus)
        )
      )
      .orderBy(desc(competitions.startDate));

    competitionItems = await query;
  } else {
    const query = db
      .select()
      .from(competitions)
      .where(eq(competitions.tenantId, tenantId))
      .orderBy(desc(competitions.startDate));

    competitionItems = await query;
  }

  return NextResponse.json(competitionItems);
}

/**
 * POST /api/competitions - Create a new competition
 * Validates required fields and creates competition with tenant isolation.
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(authData.role, 'content') && !hasPermission(authData.role, 'contentOwn')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  // Validate required fields
  if (!body.title || !body.startDate || !body.endDate) {
    return NextResponse.json(
      { error: 'Missing required fields: title, startDate, endDate' },
      { status: 400 }
    );
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const now = new Date();

  const [competition] = await db
    .insert(competitions)
    .values({
      id: crypto.randomUUID(),
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
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Revalidate content caches
  revalidateContent();

  return NextResponse.json(competition, { status: 201 });
}
