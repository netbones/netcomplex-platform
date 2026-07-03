import {
  publicProcedure,
  tenantProcedure,
  rateLimitMiddleware,
  db,
  communityServiceListings,
  communityServiceReviews,
  users,
  now,
  revalidateAdminChanges,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { reviewDto } from '@api/shared';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { ListReviewsInput, CreateReviewInput, updateListingRating } from './shared';
import { createId } from '@shared/lib/id';

export const reviewProcedures = {
  listReviews: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/reviews/{listingId}',
        protect: false,
        tags: ['marketplace'],
      },
    })
    .input(ListReviewsInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const reviews = await db
        .select({
          id: communityServiceReviews.id,
          listingId: communityServiceReviews.listingId,
          reviewerId: communityServiceReviews.reviewerId,
          rating: communityServiceReviews.rating,
          title: communityServiceReviews.title,
          comment: communityServiceReviews.comment,
          serviceDate: communityServiceReviews.serviceDate,
          responseQuality: communityServiceReviews.responseQuality,
          isPublished: communityServiceReviews.isPublished,
          createdAt: communityServiceReviews.createdAt,
          reviewer: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(communityServiceReviews)
        .leftJoin(users, eq(communityServiceReviews.reviewerId, users.id))
        .where(
          and(
            eq(communityServiceReviews.listingId, input.listingId),
            eq(communityServiceReviews.isPublished, true),
            eq(communityServiceReviews.tenantId, tenantId)
          )
        )
        .orderBy(desc(communityServiceReviews.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      await db
        .select({ count: sql<number>`count(*)` })
        .from(communityServiceReviews)
        .where(
          and(
            eq(communityServiceReviews.listingId, input.listingId),
            eq(communityServiceReviews.isPublished, true),
            eq(communityServiceReviews.tenantId, tenantId)
          )
        );

      await db
        .select({
          avgRating: sql<number>`avg(${communityServiceReviews.rating})`,
          avgResponse: sql<number>`avg(${communityServiceReviews.responseQuality})`,
          count: sql<number>`count(*)`,
        })
        .from(communityServiceReviews)
        .where(
          and(
            eq(communityServiceReviews.listingId, input.listingId),
            eq(communityServiceReviews.isPublished, true),
            eq(communityServiceReviews.tenantId, tenantId)
          )
        );

      return toEnvelope(reviews.map(r => reviewDto.parse(r)));
    }),

  createReview: tenantProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 10 }))
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/reviews/{listingId}',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(CreateReviewInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;

      const [listing] = await db
        .select({
          id: communityServiceListings.id,
          isPublished: communityServiceListings.isPublished,
          providerId: communityServiceListings.providerId,
        })
        .from(communityServiceListings)
        .where(
          and(
            eq(communityServiceListings.id, input.listingId),
            eq(communityServiceListings.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!listing || !listing.isPublished) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
      }

      if (listing.providerId === ctx.userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot review your own service' });
      }

      const [existingReview] = await db
        .select({ id: communityServiceReviews.id })
        .from(communityServiceReviews)
        .where(
          and(
            eq(communityServiceReviews.listingId, input.listingId),
            eq(communityServiceReviews.reviewerId, ctx.userId)
          )
        )
        .limit(1);

      if (existingReview) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have already reviewed this service',
        });
      }

      const reviewId = createId();
      const ts = now();

      await db.insert(communityServiceReviews).values({
        id: reviewId,
        tenantId,
        listingId: input.listingId,
        reviewerId: ctx.userId,
        rating: input.rating,
        title: input.title || null,
        comment: input.comment || null,
        serviceDate: input.serviceDate ? new Date(input.serviceDate) : null,
        responseQuality: input.responseQuality || null,
        isPublished: true,
        createdAt: ts,
      });

      await updateListingRating(input.listingId, tenantId);

      const [review] = await db
        .select({
          id: communityServiceReviews.id,
          listingId: communityServiceReviews.listingId,
          reviewerId: communityServiceReviews.reviewerId,
          rating: communityServiceReviews.rating,
          title: communityServiceReviews.title,
          comment: communityServiceReviews.comment,
          serviceDate: communityServiceReviews.serviceDate,
          responseQuality: communityServiceReviews.responseQuality,
          isPublished: communityServiceReviews.isPublished,
          createdAt: communityServiceReviews.createdAt,
          reviewer: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(communityServiceReviews)
        .leftJoin(users, eq(communityServiceReviews.reviewerId, users.id))
        .where(eq(communityServiceReviews.id, reviewId))
        .limit(1);

      revalidateAdminChanges();
      return toEnvelope(reviewDto.parse(review));
    }),
};
