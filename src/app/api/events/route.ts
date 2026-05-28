import { auth } from '@api/auth';
import { db, users } from '@api/db';
import { eq } from 'drizzle-orm';
import { revalidateContent } from '@api/revalidation';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { hasPermission } from '@entities/tenant/api/permissions';
import * as eventsService from '@entities/events/services';

import { apiCreated, apiError, apiForbidden, apiSuccess, apiUnauthorized } from '@api/api-response';
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
 * GET /api/events - List all events for the tenant
 * Returns events ordered by date descending.
 * Query params:
 *   - limit: number of events to return
 *   - upcoming: if "true", filter to events with date >= now, sorted ascending
 */
export async function GET(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const upcomingParam = url.searchParams.get('upcoming');

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const upcoming = upcomingParam === 'true';

  // Delegate to entity service
  const eventItems = await eventsService.listEvents({ tenantId, limit, upcoming });

  return apiSuccess(eventItems);
}

/**
 * POST /api/events - Create a new event
 * Validates required fields and creates event with tenant isolation.
 */
export async function POST(request: Request) {
  const authData = await getSessionAndRole(request);

  if (!authData) {
    return apiUnauthorized();
  }

  if (!hasPermission(authData.role, 'content') && !hasPermission(authData.role, 'contentOwn')) {
    return apiForbidden();
  }

  const body = await request.json();

  // Validate required fields using service
  const validation = eventsService.validateEventFields(body);
  if (!validation.valid) {
    return apiSuccess(
      {
        error: `Missing required fields: ${validation.missing?.join(', ')}`,
      },
      undefined,
      400
    );
  }

  // Enforce tenant isolation
  const { tenantId } = await withTenant();

  // Delegate to entity service for creation
  const event = await eventsService.createEvent({
    id: crypto.randomUUID(),
    tenantId,
    title: body.title,
    description: body.description,
    date: new Date(body.date),
    location: body.location,
    organizer: body.organizer,
    image: body.image || null,
    isPublic: body.isPublic !== undefined ? body.isPublic : true,
  });

  // Revalidate content caches
  revalidateContent();

  return apiCreated(event);
}
