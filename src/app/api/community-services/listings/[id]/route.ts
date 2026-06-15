import { NextRequest } from 'next/server';
import {
  auth,
  db,
  communityServiceListings,
  users,
  communityServiceReviews,
  communityServiceInquiries,
  apiError,
  apiInternalError,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
} from '@api/server';

// Drizzle imports

import { eq, desc, and, sql } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

/**
 * GET /api/community-services/listings/[id] - Get a specific service listing
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    // Drizzle query - get listing with provider details (filtered by tenant)
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
          phone: users.phone,
        },
      })
      .from(communityServiceListings)
      .leftJoin(users, eq(communityServiceListings.providerId, users.id))
      .where(
        and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
      )
      .limit(1);

    if (!listing) {
      return apiNotFound('Listing not found');
    }

    // Get reviews
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
          eq(communityServiceReviews.listingId, id),
          eq(communityServiceReviews.isPublished, true)
        )
      )
      .orderBy(desc(communityServiceReviews.createdAt))
      .limit(10);

    // Get counts
    const [reviewCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceReviews)
      .where(eq(communityServiceReviews.listingId, id));

    const [inquiryCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(communityServiceInquiries)
      .where(eq(communityServiceInquiries.listingId, id));

    // Check if user can view this listing
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // Only published listings are visible to non-owners
    if (!listing.isPublished && listing.providerId !== session?.user?.id) {
      return apiNotFound('Listing not found');
    }

    return apiSuccess({
      listing: {
        ...listing,
        CommunityServiceReview: reviews,
        _count: {
          reviews: reviewCountResult?.count || 0,
          inquiries: inquiryCountResult?.count || 0,
        },
      },
    });
  } catch (error) {
    logError(
      { component: 'listings-api', operation: 'GET' },
      'Community service listing fetch error',
      error
    );
    return apiInternalError();
  }
}

/**
 * PUT /api/community-services/listings/[id] - Update a service listing
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    // Check ownership using Drizzle (with tenant filter)
    const [existingListing] = await db
      .select({ providerId: communityServiceListings.providerId })
      .from(communityServiceListings)
      .where(
        and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
      )
      .limit(1);

    if (!existingListing) {
      return apiNotFound('Listing not found');
    }

    if (existingListing.providerId !== session.user.id) {
      return apiForbidden('Access denied');
    }

    const body = await request.json();
    type ListingUpdate = Partial<typeof communityServiceListings.$inferInsert>;
    const updateData: ListingUpdate = {
      updatedAt: new Date(),
    };

    // Only allow updating certain fields
    const allowedFields = [
      'title',
      'description',
      'subcategory',
      'priceType',
      'price',
      'serviceAreas',
      'availability',
      'licenseNumber',
      'insuranceExpiry',
      'responseTime',
      'contactMethods',
      'images',
      'portfolio',
      'termsAndConditions',
      'cancellationPolicy',
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'price' && body[field] !== null) {
          (updateData as Record<string, unknown>)[field] = String(parseFloat(body[field]));
        } else if (field === 'insuranceExpiry' && body[field]) {
          (updateData as Record<string, unknown>)[field] = new Date(body[field]);
        } else {
          (updateData as Record<string, unknown>)[field] = body[field];
        }
      }
    });

    // Update listing with Drizzle
    await db
      .update(communityServiceListings)
      .set(updateData)
      .where(eq(communityServiceListings.id, id));

    // Fetch updated listing
    const [listing] = await db
      .select()
      .from(communityServiceListings)
      .where(eq(communityServiceListings.id, id))
      .limit(1);

    return apiSuccess({
      success: true,
      listing,
    });
  } catch (error) {
    logError(
      { component: 'listings-api', operation: 'PUT' },
      'Community service listing update error',
      error
    );
    return apiInternalError();
  }
}

/**
 * DELETE /api/community-services/listings/[id] - Delete a service listing
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    // Check ownership using Drizzle (with tenant filter)
    const [existingListing] = await db
      .select({ providerId: communityServiceListings.providerId })
      .from(communityServiceListings)
      .where(
        and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
      )
      .limit(1);

    if (!existingListing) {
      return apiNotFound('Listing not found');
    }

    if (existingListing.providerId !== session.user.id) {
      return apiForbidden('Access denied');
    }

    // Delete with Drizzle (with tenant filter)
    await db
      .delete(communityServiceListings)
      .where(
        and(eq(communityServiceListings.id, id), eq(communityServiceListings.tenantId, tenantId))
      );

    return apiSuccess({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (error) {
    logError(
      { component: 'listings-api', operation: 'DELETE' },
      'Community service listing deletion error',
      error
    );
    return apiInternalError();
  }
}
