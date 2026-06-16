import { NextRequest } from 'next/server';
import {
  auth,
  db,
  communityServiceListings,
  users,
  communityServiceReviews,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
} from '@api/server';

import { assertModuleEnabled } from '@entities/tenant/server';

import { apiLogger } from '@shared/lib';

// Drizzle imports

import { eq, desc, and, or, sql, ilike } from 'drizzle-orm';

import { withTenant } from '@entities/tenant/server';
import { generateNameSlug } from '@shared/api';

type ListingStatus = (typeof communityServiceListings.status.enumValues)[number];
type ServiceCategory = (typeof communityServiceListings.category.enumValues)[number];

/**
 * GET /api/community-services/listings - Get community service listings
 */
export async function GET(request: NextRequest) {
  try {
    // Feature gate: check community_services module is enabled for tenant
    const featureCheck = await assertModuleEnabled('community_services');
    if (featureCheck) return featureCheck;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const verified = searchParams.get('verified') === 'true';
    const featured = searchParams.get('featured') === 'true';
    const providerId = searchParams.get('providerId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { tenantId } = await withTenant();

    // If id or slug provided, return single listing
    if (id || slug) {
      const whereCondition = id
        ? and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
        : and(
            eq(communityServiceListings.slug, slug!),
            eq(communityServiceListings.tenantId, tenantId)
          );
      // Drizzle query
      const [listing] = await db
        .select({
          id: communityServiceListings.id,
          providerId: communityServiceListings.providerId,
          title: communityServiceListings.title,
          description: communityServiceListings.description,
          category: communityServiceListings.category,
          subcategory: communityServiceListings.subcategory,
          priceType: communityServiceListings.priceType,
          price: communityServiceListings.price,
          currency: communityServiceListings.currency,
          serviceAreas: communityServiceListings.serviceAreas,
          availability: communityServiceListings.availability,
          licenseNumber: communityServiceListings.licenseNumber,
          insuranceExpiry: communityServiceListings.insuranceExpiry,
          verified: communityServiceListings.verified,
          verificationDate: communityServiceListings.verificationDate,
          responseTime: communityServiceListings.responseTime,
          contactMethods: communityServiceListings.contactMethods,
          images: communityServiceListings.images,
          portfolio: communityServiceListings.portfolio,
          status: communityServiceListings.status,
          isPublished: communityServiceListings.isPublished,
          isFeatured: communityServiceListings.isFeatured,
          rating: communityServiceListings.rating,
          reviewCount: communityServiceListings.reviewCount,
          termsAndConditions: communityServiceListings.termsAndConditions,
          cancellationPolicy: communityServiceListings.cancellationPolicy,
          createdAt: communityServiceListings.createdAt,
          updatedAt: communityServiceListings.updatedAt,
          slug: communityServiceListings.slug,
          provider: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
          },
        })
        .from(communityServiceListings)
        .leftJoin(users, eq(communityServiceListings.providerId, users.id))
        .where(whereCondition)
        .limit(1);

      if (!listing) {
        return apiNotFound('Service not found');
      }

      // Get review count separately
      const listingId = listing.id;
      const [reviewCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityServiceReviews)
        .where(eq(communityServiceReviews.listingId, listingId));

      return apiSuccess({
        listing: { ...listing, _count: { reviews: reviewCountResult?.count || 0 } },
      });
    }

    // Build where conditions for list query
    const conditions = [eq(communityServiceListings.tenantId, tenantId)];

    // For public listing queries, only show published+active.
    // For provider's own listings view, show all statuses.
    if (!providerId) {
      conditions.push(eq(communityServiceListings.isPublished, true));
      conditions.push(eq(communityServiceListings.status, 'ACTIVE' as ListingStatus));
    }

    if (category && category !== 'ALL') {
      conditions.push(eq(communityServiceListings.category, category as ServiceCategory));
    }

    if (verified) {
      conditions.push(eq(communityServiceListings.verified, true));
    }

    if (featured) {
      conditions.push(eq(communityServiceListings.isFeatured, true));
    }

    if (providerId) {
      conditions.push(eq(communityServiceListings.providerId, providerId));
    }

    if (search) {
      const searchLower = `%${search}%`;
      const searchCondition = or(
        ilike(communityServiceListings.title, searchLower),
        ilike(sql`coalesce(${communityServiceListings.description}, '')`, searchLower)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Get listings with pagination
    const listings = await db
      .select({
        id: communityServiceListings.id,
        providerId: communityServiceListings.providerId,
        title: communityServiceListings.title,
        description: communityServiceListings.description,
        category: communityServiceListings.category,
        subcategory: communityServiceListings.subcategory,
        priceType: communityServiceListings.priceType,
        price: communityServiceListings.price,
        currency: communityServiceListings.currency,
        serviceAreas: communityServiceListings.serviceAreas,
        verified: communityServiceListings.verified,
        rating: communityServiceListings.rating,
        reviewCount: communityServiceListings.reviewCount,
        isFeatured: communityServiceListings.isFeatured,
        isPublished: communityServiceListings.isPublished,
        status: communityServiceListings.status,
        images: communityServiceListings.images,
        createdAt: communityServiceListings.createdAt,
        slug: communityServiceListings.slug,
        provider: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        },
      })
      .from(communityServiceListings)
      .leftJoin(users, eq(communityServiceListings.providerId, users.id))
      .where(and(...conditions))
      .orderBy(
        desc(communityServiceListings.isFeatured),
        desc(communityServiceListings.rating),
        desc(communityServiceListings.createdAt)
      )
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceListings)
      .where(and(...conditions));

    const total = totalResult?.count || 0;

    // Get review counts for each listing
    const listingsWithCounts = await Promise.all(
      listings.map(async listing => {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(communityServiceReviews)
          .where(eq(communityServiceReviews.listingId, listing.id));
        return { ...listing, _count: { reviews: countResult?.count || 0 } };
      })
    );

    return apiSuccess({
      listings: listingsWithCounts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    apiLogger.error(
      { err: error, path: '/api/community-services/listings' },
      'Listings fetch error'
    );
    return apiInternalError();
  }
}

/**
 * POST /api/community-services/listings - Create a new service listing
 */
export async function POST(request: NextRequest) {
  try {
    // Feature gate: check community_services module is enabled for tenant
    const featureCheck = await assertModuleEnabled('community_services');
    if (featureCheck) return featureCheck;

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      subcategory,
      priceType,
      price,
      serviceAreas,
      availability,
      licenseNumber,
      insuranceExpiry,
      responseTime,
      contactMethods,
      images,
      portfolio,
      termsAndConditions,
      cancellationPolicy,
    } = body;

    // Create listing with Drizzle
    const listingId = crypto.randomUUID();
    const now = new Date();

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Generate unique slug from title
    const baseSlug = generateNameSlug(title || 'service');
    const [existingSlug] = await db
      .select({ slug: communityServiceListings.slug })
      .from(communityServiceListings)
      .where(eq(communityServiceListings.slug, baseSlug))
      .limit(1);
    const slug = existingSlug
      ? `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
      : baseSlug;

    await db.insert(communityServiceListings).values({
      id: listingId,
      tenantId,
      providerId: session.user.id,
      title,
      description,
      category,
      subcategory,
      priceType,
      price: price ? String(price) : null,
      serviceAreas: serviceAreas || [],
      availability,
      licenseNumber,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
      responseTime: responseTime || 24,
      contactMethods: contactMethods || ['PLATFORM_MESSAGE'],
      images: images || [],
      portfolio: portfolio || [],
      termsAndConditions,
      cancellationPolicy,
      slug,
      status: 'DRAFT',
      isPublished: false,
      rating: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Fetch the created listing
    const [listing] = await db
      .select()
      .from(communityServiceListings)
      .where(eq(communityServiceListings.id, listingId))
      .limit(1);

    return apiSuccess({
      success: true,
      listing,
    });
  } catch (error) {
    apiLogger.error(
      { err: error, path: '/api/community-services/listings' },
      'Listing creation error'
    );
    return apiInternalError();
  }
}
