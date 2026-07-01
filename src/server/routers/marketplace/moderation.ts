import {
  privilegedProcedure,
  db,
  communityServiceListings,
  users,
  now,
  revalidateAdminChanges,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ModerateListingInput, ListModerationInput, getTenantListing } from './shared';

export const moderationProcedures = {
  /**
   * List marketplace listings for moderation. Requires elevated permissions.
   * @privileged
   */
  listModerationQueue: privilegedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/moderation',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(ListModerationInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const conditions = [eq(communityServiceListings.tenantId, tenantId)];

      if (input.status && input.status !== 'ALL') {
        conditions.push(
          eq(
            communityServiceListings.status,
            input.status as (typeof communityServiceListings.status.enumValues)[number]
          )
        );
      }

      const listings = await db
        .select({
          id: communityServiceListings.id,
          providerId: communityServiceListings.providerId,
          title: communityServiceListings.title,
          category: communityServiceListings.category,
          priceType: communityServiceListings.priceType,
          price: communityServiceListings.price,
          status: communityServiceListings.status,
          isPublished: communityServiceListings.isPublished,
          rating: communityServiceListings.rating,
          verified: communityServiceListings.verified,
          createdAt: communityServiceListings.createdAt,
          provider: { id: users.id, name: users.name, email: users.email },
        })
        .from(communityServiceListings)
        .leftJoin(users, eq(communityServiceListings.providerId, users.id))
        .where(and(...conditions))
        .orderBy(desc(communityServiceListings.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityServiceListings)
        .where(and(...conditions));

      return toEnvelope({
        listings,
        pagination: {
          total: totalResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < (totalResult?.count || 0),
        },
      });
    }),

  /**
   * Moderate a marketplace listing. Requires elevated permissions.
   * @privileged
   */
  moderateListing: privilegedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/moderation/{id}',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(ModerateListingInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      await getTenantListing(input.id, tenantId);

      const isActive = input.status === 'ACTIVE';
      await db
        .update(communityServiceListings)
        .set({
          status: input.status,
          isPublished: input.isPublished ?? isActive,
          moderatedBy: ctx.userId,
          moderatedAt: now(),
          moderationNotes: input.notes || null,
          updatedAt: now(),
        })
        .where(
          and(
            eq(communityServiceListings.id, input.id),
            eq(communityServiceListings.tenantId, tenantId)
          )
        );

      const [listing] = await db
        .select()
        .from(communityServiceListings)
        .where(eq(communityServiceListings.id, input.id))
        .limit(1);

      revalidateAdminChanges();
      return toEnvelope({ success: true, listing });
    }),
};
