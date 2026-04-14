import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { apiLogger } from '@/lib/logger';

// Drizzle imports
import { db, communityServiceListings, users } from '@/lib/db';
import { eq, desc, and, or, sql, ilike } from 'drizzle-orm';
import { communityServiceReviews } from '@/lib/db';
import { withTenant } from '@/lib/tenant/with-tenant';

type ListingStatus = (typeof communityServiceListings.status.enumValues)[number];
type ServiceCategory = (typeof communityServiceListings.category.enumValues)[number];

/**
 * GET /api/community-services/listings - Get community service listings
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const verified = searchParams.get('verified') === 'true';
    const featured = searchParams.get('featured') === 'true';
    const providerId = searchParams.get('providerId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If id is provided, return single listing
    if (id) {
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
          provider: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
          },
        })
        .from(communityServiceListings)
        .leftJoin(users, eq(communityServiceListings.providerId, users.id))
        .where(eq(communityServiceListings.id, id))
        .limit(1);

      if (!listing) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }

      // Get review count separately (Drizzle doesn't support count in select for relates)
      const [reviewCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityServiceReviews)
        .where(eq(communityServiceReviews.listingId, id));

      return NextResponse.json({
        listing: { ...listing, _count: { reviews: reviewCountResult?.count || 0 } },
      });
    }

    // Build where conditions for list query
    const conditions = [
      eq(communityServiceListings.isPublished, true),
      eq(communityServiceListings.status, 'ACTIVE' as ListingStatus),
    ];

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
        images: communityServiceListings.images,
        createdAt: communityServiceListings.createdAt,
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

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/community-services/listings - Create a new service listing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json({
      success: true,
      listing,
    });
  } catch (error) {
    apiLogger.error(
      { err: error, path: '/api/community-services/listings' },
      'Listing creation error'
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
