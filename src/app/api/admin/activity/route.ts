import { NextRequest } from 'next/server';
import { apiSuccess, apiInternalError } from '@api/api-response';
import { requireAnyPermission } from '@api/auth-utils';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { db, maintenanceRequests, users, contents, surveys, events } from '@api/db';
import { eq, and, lt, desc, inArray, sql } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('activity-api');

/** Internal type for query results before actor resolution */
interface ActivityItemRaw {
  id: string;
  domain: string;
  action: string;
  resourceLabel: string | null;
  actorId: string | null;
  createdAt: Date;
  metadata: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAnyPermission(['admin', 'settings']);
    if (authError) return authError;

    const { tenantId: defaultTenantId } = await withTenant();

    // Query params
    const { searchParams } = request.nextUrl;
    const domain = searchParams.get('domain') || 'all';
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(limitParam, 1), 50);
    const cursor = searchParams.get('cursor');

    // Platform admin cross-tenant support
    let tenantId = defaultTenantId;
    const requestedTenantId = searchParams.get('tenantId');
    if (requestedTenantId) {
      const session = await import('@api/auth-utils').then(m => m.getSessionAndRole());
      if (session?.role) {
        const [currentUser] = await db
          .select({ isPlatformAdmin: users.isPlatformAdmin })
          .from(users)
          .where(eq(users.id, session.userId))
          .limit(1);
        if (currentUser?.isPlatformAdmin) {
          tenantId = requestedTenantId;
        }
      }
    }

    // Build per-domain queries conditionally based on domain filter
    const domainQueries: Promise<ActivityItemRaw[]>[] = [];

    if (domain === 'all' || domain === 'maintenance') {
      domainQueries.push(
        db
          .select({
            id: maintenanceRequests.id,
            domain: sql<string>`'maintenance'`,
            action: sql<string>`
  CASE status
  WHEN 'SUBMITTED' THEN 'submitted'
  WHEN 'ASSIGNED' THEN 'assigned'
  WHEN 'SCHEDULED' THEN 'scheduled'
  WHEN 'IN_PROGRESS' THEN 'started'
  WHEN 'PENDING_PARTS' THEN 'pending_parts'
  WHEN 'COMPLETED' THEN 'completed'
  WHEN 'CANCELLED' THEN 'cancelled'
  ELSE 'updated'
  END
  `,
            resourceLabel: maintenanceRequests.description,
            actorId: maintenanceRequests.userId,
            createdAt: maintenanceRequests.updatedAt,
            metadata: sql<string>`json_build_object(
  'status', status,
  'category', category,
  'priority', priority,
  'ticketNumber', "ticketNumber"
  )`,
          })
          .from(maintenanceRequests)
          .where(
            and(
              eq(maintenanceRequests.tenantId, tenantId),
              cursor ? lt(maintenanceRequests.updatedAt, new Date(cursor)) : undefined
            )
          )
          .orderBy(desc(maintenanceRequests.updatedAt))
          .limit(limit)
          .then(rows => rows.map(r => ({ ...r, domain: 'maintenance' as const })))
      );
    }

    if (domain === 'all' || domain === 'users') {
      domainQueries.push(
        db
          .select({
            id: users.id,
            domain: sql<string>`'users'`,
            action: sql<string>`'joined'`,
            resourceLabel: users.name,
            actorId: users.id,
            createdAt: users.createdAt,
            metadata: sql<string>`json_build_object('role', role, 'email', email)`,
          })
          .from(users)
          .where(
            and(
              eq(users.tenantId, tenantId),
              cursor ? lt(users.createdAt, new Date(cursor)) : undefined
            )
          )
          .orderBy(desc(users.createdAt))
          .limit(limit)
          .then(rows => rows.map(r => ({ ...r, domain: 'users' as const })))
      );
    }

    if (domain === 'all' || domain === 'content') {
      domainQueries.push(
        db
          .select({
            id: contents.id,
            domain: sql<string>`'content'`,
            action: sql<string>`CASE WHEN published THEN 'published' ELSE 'drafted' END`,
            resourceLabel: sql<string>`title->>'en'`,
            actorId: contents.authorId,
            createdAt: contents.updatedAt,
            metadata: sql<string>`json_build_object('category', category, 'published', published)`,
          })
          .from(contents)
          .where(
            and(
              eq(contents.tenantId, tenantId),
              cursor ? lt(contents.updatedAt, new Date(cursor)) : undefined
            )
          )
          .orderBy(desc(contents.updatedAt))
          .limit(limit)
          .then(rows => rows.map(r => ({ ...r, domain: 'content' as const })))
      );
    }

    if (domain === 'all' || domain === 'surveys') {
      domainQueries.push(
        db
          .select({
            id: surveys.id,
            domain: sql<string>`'surveys'`,
            action: sql<string>`
              CASE status
              WHEN 'ACTIVE' THEN 'activated'
              WHEN 'CLOSED' THEN 'closed'
              ELSE 'updated'
              END
            `,
            resourceLabel: surveys.title,
            actorId: sql<string | null>`null`,
            createdAt: surveys.updatedAt,
            metadata: sql<string>`json_build_object('status', status)`,
          })
          .from(surveys)
          .where(
            and(
              eq(surveys.tenantId, tenantId),
              cursor ? lt(surveys.updatedAt, new Date(cursor)) : undefined
            )
          )
          .orderBy(desc(surveys.updatedAt))
          .limit(limit)
          .then(rows => rows.map(r => ({ ...r, domain: 'surveys' as const })))
      );
    }

    if (domain === 'all' || domain === 'events') {
      domainQueries.push(
        db
          .select({
            id: events.id,
            domain: sql<string>`'events'`,
            action: sql<string>`'updated'`,
            resourceLabel: events.title,
            actorId: sql<string | null>`null`,
            createdAt: events.updatedAt,
            metadata: sql<string>`json_build_object('date', date, 'location', location)`,
          })
          .from(events)
          .where(
            and(
              eq(events.tenantId, tenantId),
              cursor ? lt(events.updatedAt, new Date(cursor)) : undefined
            )
          )
          .orderBy(desc(events.updatedAt))
          .limit(limit)
          .then(rows => rows.map(r => ({ ...r, domain: 'events' as const })))
      );
    }

    // Run all domain queries in parallel
    const results = await Promise.all(domainQueries);

    // Flatten, sort by createdAt desc, slice to limit
    const feed = results
      .flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    // Fetch actor names in one batch query (avoid N+1)
    const actorIds = [...new Set(feed.map(f => f.actorId).filter(Boolean))] as string[];
    const actors =
      actorIds.length > 0
        ? await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, actorIds))
        : [];
    const actorMap = Object.fromEntries(actors.map(a => [a.id, a.name]));

    // Attach actor names + derive next cursor
    const items = feed.map(f => ({
      ...f,
      actorName: f.actorId ? (actorMap[f.actorId] ?? 'Unknown') : null,
      metadata: typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata,
    }));

    const nextCursor =
      items.length === limit ? items[items.length - 1].createdAt.toISOString() : null;

    return apiSuccess({ items, nextCursor }, undefined, 200, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get activity feed', error);
    return apiInternalError(String(error));
  }
}
