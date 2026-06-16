import { NextRequest } from 'next/server';

// Drizzle imports
import {
  db,
  communityServiceListings,
  users,
  communityServiceReviews,
  apiError,
  apiInternalError,
  apiSuccess,
  apiNotFound,
} from '@api/server';

import { eq, desc, and, or, sql, inArray } from 'drizzle-orm';

import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 5;

export async function GET(request: NextRequest) {
  try {
    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');
    const limit = parseInt(searchParams.get('limit') || '4');

    if (!serviceId) {
      return apiError('VALIDATION_ERROR', 'serviceId is required', 400);
    }

    // Get current service details using Drizzle (with tenant filter)
    const [currentService] = await db
      .select({
        category: communityServiceListings.category,
        title: communityServiceListings.title,
        description: communityServiceListings.description,
      })
      .from(communityServiceListings)
      .where(
        and(
          eq(communityServiceListings.id, serviceId),
          eq(communityServiceListings.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!currentService) {
      return apiNotFound('Service not found');
    }

    // Build search term from first word of title (handle JSON-encoded titles)
    const rawTitle = (currentService.title as string) ?? '';
    let titleText = rawTitle;
    try {
      const parsed = JSON.parse(rawTitle);
      if (typeof parsed === 'object' && parsed !== null) {
        titleText = String(Object.values(parsed).find(Boolean) || '');
      }
    } catch {
      /* not JSON, use as-is */
    }
    const searchTerm = String(titleText).split(' ')[0] || '';
    const searchPattern = `%${searchTerm.toLowerCase()}%`;

    // Get related services using Drizzle (with tenant filter)
    const relatedServices = await db
      .select({
        id: communityServiceListings.id,
        title: communityServiceListings.title,
        description: communityServiceListings.description,
        category: communityServiceListings.category,
        subcategory: communityServiceListings.subcategory,
        priceType: communityServiceListings.priceType,
        price: communityServiceListings.price,
        rating: communityServiceListings.rating,
        reviewCount: communityServiceListings.reviewCount,
        images: communityServiceListings.images,
        verified: communityServiceListings.verified,
        isFeatured: communityServiceListings.isFeatured,
        createdAt: communityServiceListings.createdAt,
        provider: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(communityServiceListings)
      .leftJoin(users, eq(communityServiceListings.providerId, users.id))
      .where(
        and(
          eq(communityServiceListings.tenantId, tenantId),
          eq(communityServiceListings.isPublished, true),
          eq(communityServiceListings.status, 'ACTIVE' as const),
          sql`${communityServiceListings.id} != ${serviceId}`,
          or(
            eq(communityServiceListings.category, currentService.category),
            sql`lower(${communityServiceListings.title}) like ${searchPattern}`
          )
        )
      )
      .orderBy(desc(communityServiceListings.rating), desc(communityServiceListings.reviewCount))
      .limit(limit);

    // Get review counts for each listing
    const relatedIds = relatedServices.map(s => s.id);

    const reviewCounts =
      relatedIds.length > 0
        ? await db
            .select({
              listingId: communityServiceReviews.listingId,
              count: sql<number>`count(*)::int`,
            })
            .from(communityServiceReviews)
            .where(inArray(communityServiceReviews.listingId, relatedIds))
            .groupBy(communityServiceReviews.listingId)
        : [];

    const countByListingId = new Map(reviewCounts.map(r => [r.listingId, r.count]));

    const relatedWithCounts = relatedServices.map(service => ({
      ...service,
      _count: { reviews: countByListingId.get(service.id) ?? 0 },
    }));

    return apiSuccess({ relatedServices: relatedWithCounts });
  } catch (error) {
    logError(
      { component: 'related-services-api', operation: 'GET' },
      'Related services fetch error',
      error
    );
    return apiInternalError();
  }
}
