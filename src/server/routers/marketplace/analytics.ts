import { z } from 'zod';
import {
  adminProcedure,
  db,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
  now,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { TRPCError } from '@trpc/server';
import { eq, and, sql } from 'drizzle-orm';

export const analyticsProcedures = {
  getAnalytics: adminProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/analytics',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(
      z
        .object({ period: z.enum(['7d', '30d', '90d', 'all']).default('30d') })
        .optional()
        .default({ period: '30d' })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const ts = now();
      let startDate: Date;
      switch (input.period) {
        case '7d':
          startDate = new Date(ts.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(ts.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(ts.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date('2020-01-01');
      }

      const [[totalListings], [activeListings], [ratingStats], [reviewsCount], [inquiriesCount]] =
        await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(communityServiceListings)
            .where(eq(communityServiceListings.tenantId, tenantId)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(communityServiceListings)
            .where(
              and(
                eq(communityServiceListings.tenantId, tenantId),
                eq(communityServiceListings.isPublished, true),
                eq(communityServiceListings.status, 'ACTIVE')
              )
            ),
          db
            .select({
              avgRating: sql<number>`avg(${communityServiceReviews.rating})`,
              count: sql<number>`count(*)`,
            })
            .from(communityServiceReviews)
            .where(
              sql`EXISTS (SELECT 1 FROM "communityServiceListings" WHERE "communityServiceListings"."id" = ${communityServiceReviews.listingId} AND "communityServiceListings"."tenantId" = ${tenantId})`
            ),
          db
            .select({ count: sql<number>`count(*)` })
            .from(communityServiceReviews)
            .where(
              and(
                sql`${communityServiceReviews.createdAt} >= ${startDate}`,
                sql`EXISTS (SELECT 1 FROM "communityServiceListings" WHERE "communityServiceListings"."id" = ${communityServiceReviews.listingId} AND "communityServiceListings"."tenantId" = ${tenantId})`
              )
            ),
          db
            .select({ count: sql<number>`count(*)` })
            .from(communityServiceInquiries)
            .where(
              and(
                sql`${communityServiceInquiries.createdAt} >= ${startDate}`,
                sql`EXISTS (SELECT 1 FROM "communityServiceListings" WHERE "communityServiceListings"."id" = ${communityServiceInquiries.listingId} AND "communityServiceListings"."tenantId" = ${tenantId})`
              )
            ),
        ]);

      const providerListings = await db
        .select({ providerId: communityServiceListings.providerId })
        .from(communityServiceListings)
        .where(
          and(
            eq(communityServiceListings.tenantId, tenantId),
            eq(communityServiceListings.isPublished, true)
          )
        );

      const uniqueProviders = new Set(providerListings.map(l => l.providerId));

      const categoryStats = await db
        .select({ category: communityServiceListings.category, count: sql<number>`count(*)` })
        .from(communityServiceListings)
        .where(
          and(
            eq(communityServiceListings.tenantId, tenantId),
            eq(communityServiceListings.isPublished, true),
            eq(communityServiceListings.status, 'ACTIVE')
          )
        )
        .groupBy(communityServiceListings.category);

      return toEnvelope({
        overview: {
          totalListings: totalListings?.count || 0,
          activeListings: activeListings?.count || 0,
          totalProviders: uniqueProviders.size,
          totalReviews: reviewsCount?.count || 0,
          totalInquiries: inquiriesCount?.count || 0,
          averageRating: Number(ratingStats?.avgRating) || 0,
          totalRatingCount: ratingStats?.count || 0,
        },
        categories: categoryStats.map(c => ({ category: c.category, count: c.count })),
        period: input.period,
        generatedAt: now().toISOString(),
      });
    }),
};
