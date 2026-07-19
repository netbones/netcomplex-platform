import { z } from 'zod';
import {
  adminProcedure,
  db,
  router,
  toEnvelope,
  maintenanceRequests,
  users,
  contents,
  surveys,
  events,
} from '@api/server';
import { eq, and, lt, desc, inArray, sql } from 'drizzle-orm';

interface ActivityItemRaw {
  id: string;
  domain: string;
  action: string;
  resourceLabel: string | null;
  actorId: string | null;
  createdAt: Date;
  metadata: unknown;
}

const ListActivityInput = z.object({
  domain: z.enum(['all', 'maintenance', 'users', 'content', 'surveys', 'events']).default('all'),
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  tenantId: z.string().optional(),
});

export const adminActivityRouter = router({
  /**
   * Get activity feed for admin dashboard.
   * Replaces GET /api/admin/activity
   */
  listActivity: adminProcedure.input(ListActivityInput).query(async ({ ctx, input }) => {
    const domain = input.domain;
    const limit = input.limit;
    const cursor = input.cursor;

    // Use current tenantId if not provided/overridden
    let tenantId = ctx.tenantId;
    if (input.tenantId && ctx.role === 'ADMIN') {
      tenantId = input.tenantId;
    }

    if (!tenantId) {
      return toEnvelope({ items: [], nextCursor: null });
    }

    const domainQueries: (() => Promise<ActivityItemRaw[]>)[] = [];

    if (domain === 'all' || domain === 'maintenance') {
      domainQueries.push(() =>
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
          .then(rows => rows.map(r => ({ ...r, domain: 'maintenance' })))
      );
    }

    if (domain === 'all' || domain === 'users') {
      domainQueries.push(() =>
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
          .then(rows => rows.map(r => ({ ...r, domain: 'users' })))
      );
    }

    if (domain === 'all' || domain === 'content') {
      domainQueries.push(() =>
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
          .then(rows => rows.map(r => ({ ...r, domain: 'content' })))
      );
    }

    if (domain === 'all' || domain === 'surveys') {
      domainQueries.push(() =>
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
          .then(rows => rows.map(r => ({ ...r, domain: 'surveys' })))
      );
    }

    if (domain === 'all' || domain === 'events') {
      domainQueries.push(() =>
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
          .then(rows => rows.map(r => ({ ...r, domain: 'events' })))
      );
    }

    const results: ActivityItemRaw[][] = [];
    for (const q of domainQueries) {
      results.push(await q());
    }

    const feed = results
      .flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    const actorIds = [...new Set(feed.map(f => f.actorId).filter(Boolean))] as string[];
    const actors =
      actorIds.length > 0
        ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, actorIds))
        : [];
    const actorMap = Object.fromEntries(actors.map(a => [a.id, a.name]));

    const items = feed.map(f => ({
      ...f,
      actorName: f.actorId ? (actorMap[f.actorId] ?? 'Unknown') : null,
      metadata: typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata,
    }));

    const nextCursor =
      items.length === limit ? items[items.length - 1].createdAt.toISOString() : null;

    return toEnvelope({ items, nextCursor });
  }),
});
