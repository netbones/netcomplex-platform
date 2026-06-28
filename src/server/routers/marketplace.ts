import { z } from 'zod';
import {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  db,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
  serviceBookings,
  paymentTransactions,
  premiumSeats,
  properties,
  propertyListings,
  propertyPremiumSeats,
  maintenanceRequests,
  bookings,
  users,
  now,
  revalidateAdminChanges,
  assertAddressUnique,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission, createComponentLogger } from '@shared/lib';
import {
  initializeCheckout,
  calculatePlatformFee,
  serviceBookingSchema,
  checkoutRequestSchema,
  getProviderRecordForUser,
  notifyPaymentReceived,
} from '@entities/marketplace/server';
import { getPlatformPageFlags } from '@entities/tenant/server';
import { PaystackService } from '@/server/payments';

import { eq, and, desc, isNull, sql, ilike, inArray, or, ne, gte, lte, count } from 'drizzle-orm';

const SERVICE_CATEGORIES = {
  COMMUNITY: [
    'TUTORING',
    'PET_CARE',
    'CHILDCARE',
    'TRANSPORT',
    'HEALTH_WELLNESS',
    'TECHNOLOGY',
    'CREATIVE_ARTS',
    'HOME_HELP',
    'LEGAL_FINANCIAL',
    'OTHER',
  ],
  THIRD_PARTY: [
    'GARDENING',
    'MAINTENANCE',
    'PLUMBING',
    'ELECTRICAL',
    'CLEANING',
    'SECURITY',
    'PEST_CONTROL',
    'APPLIANCE_REPAIR',
    'OTHER',
  ],
} as const;

const PriceTypeEnum = z.enum(['FIXED', 'HOURLY', 'QUOTE', 'FREE']);
const ListingStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'PENDING', 'SOLD', 'RENTED', 'WITHDRAWN']);
const InquiryStatusEnum = z.enum([
  'PENDING',
  'RESPONDED',
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
  'CANCELLED',
]);
const ProviderTypeEnum = z.enum(['COMMUNITY', 'THIRD_PARTY']);

const PaginationInput = z
  .object({
    limit: z.number().int().positive().default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional()
  .default({ limit: 20, offset: 0 });

const IdInput = z.object({ id: z.string() });

const LocaleInput = z.object({
  id: z.string(),
  locale: z.string().optional(),
});

// ──────────────────────────────────────────
// Listing Schemas
// ──────────────────────────────────────────

const ListListingsInput = z
  .object({
    category: z.string().optional(),
    search: z.string().optional(),
    verified: z.boolean().optional(),
    featured: z.boolean().optional(),
    providerId: z.string().optional(),
    minRating: z.number().min(0).max(5).optional(),
    priceType: PriceTypeEnum.optional(),
    locale: z.string().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional()
  .default({ limit: 20, offset: 0 });

const CreateListingInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  providerType: ProviderTypeEnum.default('COMMUNITY'),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  priceType: PriceTypeEnum,
  price: z.number().positive().optional(),
  currency: z.string().default('ZAR'),
  serviceAreas: z.array(z.string()).default([]),
  availability: z.any().optional(),
  licenseNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  responseTime: z.number().int().positive().default(24),
  contactMethods: z.array(z.string()).default(['PLATFORM_MESSAGE']),
  images: z.array(z.string()).default([]),
  portfolio: z.array(z.string()).default([]),
  termsAndConditions: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  locale: z.string().default('en'),
});

const UpdateListingInput = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  priceType: PriceTypeEnum.optional(),
  price: z.number().positive().optional(),
  currency: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
  availability: z.any().optional(),
  licenseNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  responseTime: z.number().int().positive().optional(),
  contactMethods: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  portfolio: z.array(z.string()).optional(),
  termsAndConditions: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  locale: z.string().optional(),
});

const PublishListingInput = z.object({
  id: z.string(),
  publish: z.boolean(),
});

// ──────────────────────────────────────────
// Inquiry Schemas
// ──────────────────────────────────────────

const CreateInquiryInput = z.object({
  listingId: z.string().min(1),
  serviceType: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  location: z.string().optional(),
  description: z.string().min(1),
  contactMethod: z.string().default('PLATFORM_MESSAGE'),
});

const ListInquiriesInput = z
  .object({
    status: z.string().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional()
  .default({ limit: 20, offset: 0 });

const RespondToInquiryInput = z.object({
  id: z.string(),
  response: z.string().optional(),
  status: InquiryStatusEnum.optional(),
});

// ──────────────────────────────────────────
// Review Schemas
// ──────────────────────────────────────────

const ListReviewsInput = z.object({
  listingId: z.string().min(1),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().min(0).default(0),
});

const CreateReviewInput = z.object({
  listingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
  serviceDate: z.string().optional(),
  responseQuality: z.number().int().min(1).max(5).optional(),
});

// ──────────────────────────────────────────
// Moderation Schemas
// ──────────────────────────────────────────

const ModerateListingInput = z.object({
  id: z.string(),
  status: ListingStatusEnum,
  isPublished: z.boolean().optional(),
  notes: z.string().optional(),
});

const ListModerationInput = z
  .object({
    status: z.string().optional(),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().min(0).default(0),
  })
  .optional()
  .default({ limit: 20, offset: 0 });

// ──────────────────────────────────────────
// Booking Schemas
// ──────────────────────────────────────────

const ListServiceBookingsInput = z
  .object({
    role: z.enum(['resident', 'provider']).default('resident'),
    limit: z.number().int().positive().default(20),
    offset: z.number().int().min(0).default(0),
  })
  .default({ role: 'resident', limit: 20, offset: 0 });

const BookingIdParam = z.object({ bookingId: z.string().min(1) });

const CancelBookingInput = z.object({
  bookingId: z.string().min(1),
  status: z.literal('CANCELLED'),
});

// ──────────────────────────────────────────
// Checkout Schemas
// ──────────────────────────────────────────

// Reuses checkoutRequestSchema from @entities/marketplace/server

// ──────────────────────────────────────────
// Webhook Schemas
// ──────────────────────────────────────────

const WebhookInput = z.object({
  body: z.string(),
  signature: z.string(),
});

// ──────────────────────────────────────────
// Urgency Schemas
// ──────────────────────────────────────────

// No input params needed for getUrgencyLevels

// ──────────────────────────────────────────
// Premium/Portfolio Schemas
// ──────────────────────────────────────────

const CreatePremiumListingInput = z.object({
  propertyId: z.string().min(1),
  listingType: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().int().positive().optional(),
  parkingSpaces: z.number().int().positive().optional(),
  gardenSize: z.number().positive().optional(),
  petFriendly: z.boolean().optional(),
});

const UpgradePortfolioInput = z.object({
  householdIds: z.array(z.string()).min(2),
});

const UrgencyLogger = createComponentLogger('trpc-marketplace-urgency');

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function resolveLocaleText(
  value: Record<string, string> | string | null | undefined,
  preferredLocale: string
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[preferredLocale] || Object.values(value)[0] || '';
}

/** Verify a listing exists in the user's tenant */
async function getTenantListing(listingId: string, tenantId: string) {
  const [listing] = await db
    .select()
    .from(communityServiceListings)
    .where(
      and(
        eq(communityServiceListings.id, listingId),
        eq(communityServiceListings.tenantId, tenantId),
        isNull(communityServiceListings.deletedAt)
      )
    );
  if (!listing) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
  }
  return listing;
}

/** Update a listing's aggregate rating from its published reviews */
async function updateListingRating(listingId: string, tenantId: string) {
  const [ratingStats] = await db
    .select({
      avgRating: sql<number>`avg(${communityServiceReviews.rating})`,
      reviewCount: sql<number>`count(*)`,
    })
    .from(communityServiceReviews)
    .where(
      and(
        eq(communityServiceReviews.listingId, listingId),
        eq(communityServiceReviews.isPublished, true)
      )
    );

  await db
    .update(communityServiceListings)
    .set({
      rating: Number(ratingStats?.avgRating) || 0,
      reviewCount: ratingStats?.reviewCount || 0,
      updatedAt: now(),
    })
    .where(
      and(
        eq(communityServiceListings.id, listingId),
        eq(communityServiceListings.tenantId, tenantId)
      )
    );
}

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const marketplaceRouter = router({
  // ────────── LISTINGS ──────────

  listListings: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/listings',
        protect: false,
        tags: ['marketplace'],
      },
    })
    .input(ListListingsInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conditions: ReturnType<typeof eq>[] = [
        eq(communityServiceListings.tenantId, tenantId),
        isNull(communityServiceListings.deletedAt),
      ];

      if (!input.providerId) {
        conditions.push(eq(communityServiceListings.isPublished, true));
        conditions.push(eq(communityServiceListings.status, 'ACTIVE'));
      }

      if (input.category && input.category !== 'ALL') {
        conditions.push(eq(communityServiceListings.category, input.category));
      }

      if (input.verified) {
        conditions.push(eq(communityServiceListings.verified, true));
      }

      if (input.featured) {
        conditions.push(eq(communityServiceListings.isFeatured, true));
      }

      if (input.providerId) {
        conditions.push(eq(communityServiceListings.providerId, input.providerId));
      }

      if (input.priceType) {
        conditions.push(eq(communityServiceListings.priceType, input.priceType));
      }

      if (input.minRating !== undefined) {
        conditions.push(sql`${communityServiceListings.rating} >= ${input.minRating}`);
      }

      if (input.search) {
        const searchLower = `%${input.search}%`;
        conditions.push(
          or(
            ilike(sql`${communityServiceListings.title}::text`, searchLower),
            ilike(sql`coalesce(${communityServiceListings.description}::text, '')`, searchLower)
          )!
        );
      }

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
          locale: communityServiceListings.locale,
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
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityServiceListings)
        .where(and(...conditions));

      const total = totalResult?.count || 0;

      const preferredLocale = input.locale || 'en';
      const localized = listings.map(l => ({
        ...l,
        title: resolveLocaleText(l.title as Record<string, string>, preferredLocale),
        description: resolveLocaleText(
          l.description as Record<string, string> | null,
          preferredLocale
        ),
      }));

      return {
        listings: localized,
        pagination: {
          total,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < total,
        },
      };
    }),

  getListing: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/listings/{id}',
        protect: false,
        tags: ['marketplace'],
      },
    })
    .input(LocaleInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

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
            phone: users.phone,
          },
        })
        .from(communityServiceListings)
        .leftJoin(users, eq(communityServiceListings.providerId, users.id))
        .where(
          and(
            isNull(communityServiceListings.deletedAt),
            eq(communityServiceListings.id, input.id),
            eq(communityServiceListings.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!listing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
      }

      if (!listing.isPublished && listing.providerId !== ctx.userId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
      }

      const preferredLocale = input.locale || 'en';
      const localized = {
        ...listing,
        title: resolveLocaleText(listing.title as Record<string, string>, preferredLocale),
        description: resolveLocaleText(
          listing.description as Record<string, string> | null,
          preferredLocale
        ),
      };

      return { listing: localized };
    }),

  createListing: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/listings',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(CreateListingInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const listingId = crypto.randomUUID();
      const ts = now();
      const titleJsonb = { [input.locale]: input.title };
      const descriptionJsonb = input.description ? { [input.locale]: input.description } : null;

      await db.insert(communityServiceListings).values({
        id: listingId,
        tenantId,
        providerId: ctx.userId!,
        providerType: input.providerType,
        title: titleJsonb,
        description: descriptionJsonb as Record<string, string>,
        locale: input.locale,
        category: input.category,
        subcategory: input.subcategory || null,
        priceType: input.priceType,
        price: input.price ? String(input.price) : null,
        currency: input.currency,
        serviceAreas: input.serviceAreas,
        availability: input.availability || null,
        licenseNumber: input.licenseNumber || null,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        responseTime: input.responseTime,
        contactMethods: input.contactMethods,
        images: input.images,
        portfolio: input.portfolio,
        termsAndConditions: input.termsAndConditions || null,
        cancellationPolicy: input.cancellationPolicy || null,
        status: 'DRAFT',
        isPublished: false,
        rating: 0,
        reviewCount: 0,
        createdAt: ts,
        updatedAt: ts,
      });

      const [listing] = await db
        .select()
        .from(communityServiceListings)
        .where(eq(communityServiceListings.id, listingId))
        .limit(1);

      revalidateAdminChanges();
      return { success: true, listing };
    }),

  updateListing: protectedProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/marketplace/listings/{id}',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(UpdateListingInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const existing = await getTenantListing(input.id, tenantId);

      if (existing.providerId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const updateData: Record<string, unknown> = { updatedAt: now() };

      if (input.title !== undefined) {
        const locale = input.locale || existing.locale || 'en';
        const currentTitle = (existing.title as Record<string, string>) || {};
        updateData.title = { ...currentTitle, [locale]: input.title };
      }
      if (input.description !== undefined) {
        const locale = input.locale || existing.locale || 'en';
        const currentDesc = (existing.description as Record<string, string> | null) || {};
        updateData.description = { ...currentDesc, [locale]: input.description };
      }
      if (input.category !== undefined) updateData.category = input.category;
      if (input.subcategory !== undefined) updateData.subcategory = input.subcategory;
      if (input.priceType !== undefined) updateData.priceType = input.priceType;
      if (input.price !== undefined) updateData.price = String(input.price);
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.serviceAreas !== undefined) updateData.serviceAreas = input.serviceAreas;
      if (input.availability !== undefined) updateData.availability = input.availability;
      if (input.licenseNumber !== undefined) updateData.licenseNumber = input.licenseNumber;
      if (input.insuranceExpiry !== undefined) {
        updateData.insuranceExpiry = input.insuranceExpiry ? new Date(input.insuranceExpiry) : null;
      }
      if (input.responseTime !== undefined) updateData.responseTime = input.responseTime;
      if (input.contactMethods !== undefined) updateData.contactMethods = input.contactMethods;
      if (input.images !== undefined) updateData.images = input.images;
      if (input.portfolio !== undefined) updateData.portfolio = input.portfolio;
      if (input.termsAndConditions !== undefined)
        updateData.termsAndConditions = input.termsAndConditions;
      if (input.cancellationPolicy !== undefined)
        updateData.cancellationPolicy = input.cancellationPolicy;
      if (input.locale !== undefined) updateData.locale = input.locale;

      await db
        .update(communityServiceListings)
        .set(updateData)
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
      return { success: true, listing };
    }),

  deleteListing: protectedProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/marketplace/listings/{id}',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(IdInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const existing = await getTenantListing(input.id, tenantId);

      if (existing.providerId !== ctx.userId && !hasPermission(ctx.role, 'content')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      await db
        .update(communityServiceListings)
        .set({ deletedAt: now(), updatedAt: now() })
        .where(
          and(
            eq(communityServiceListings.id, input.id),
            eq(communityServiceListings.tenantId, tenantId)
          )
        );

      revalidateAdminChanges();
      return { success: true, message: 'Listing deleted' };
    }),

  publishListing: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/listings/{id}/publish',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(PublishListingInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const existing = await getTenantListing(input.id, tenantId);

      if (existing.providerId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      await db
        .update(communityServiceListings)
        .set({
          isPublished: input.publish,
          status: input.publish ? 'ACTIVE' : 'DRAFT',
          updatedAt: now(),
        })
        .where(eq(communityServiceListings.id, input.id));

      const [listing] = await db
        .select()
        .from(communityServiceListings)
        .where(eq(communityServiceListings.id, input.id))
        .limit(1);

      revalidateAdminChanges();
      return {
        success: true,
        listing,
        message: input.publish ? 'Listing published' : 'Listing unpublished',
      };
    }),

  listMyListings: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/my-listings',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(PaginationInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conditions = [
        eq(communityServiceListings.tenantId, tenantId),
        eq(communityServiceListings.providerId, ctx.userId!),
        isNull(communityServiceListings.deletedAt),
      ];

      const listings = await db
        .select()
        .from(communityServiceListings)
        .where(and(...conditions))
        .orderBy(desc(communityServiceListings.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityServiceListings)
        .where(and(...conditions));

      return {
        listings,
        pagination: {
          total: totalResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < (totalResult?.count || 0),
        },
      };
    }),

  // ────────── CATEGORIES ──────────

  getCategories: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/categories',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .query(async () => {
      return {
        categories: SERVICE_CATEGORIES,
        flat: [...SERVICE_CATEGORIES.COMMUNITY, ...SERVICE_CATEGORIES.THIRD_PARTY],
      };
    }),

  // ────────── INQUIRIES ──────────

  createInquiry: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/inquiries',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(CreateInquiryInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [listing] = await db
        .select({
          id: communityServiceListings.id,
          isPublished: communityServiceListings.isPublished,
          providerId: communityServiceListings.providerId,
        })
        .from(communityServiceListings)
        .where(eq(communityServiceListings.id, input.listingId))
        .limit(1);

      if (!listing || !listing.isPublished) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Service listing not found' });
      }

      if (listing.providerId === ctx.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot inquire about your own service',
        });
      }

      const inquiryId = crypto.randomUUID();
      const ts = now();

      await db.insert(communityServiceInquiries).values({
        id: inquiryId,
        tenantId,
        listingId: input.listingId,
        inquirerId: ctx.userId!,
        serviceType: input.serviceType || null,
        preferredDate: input.preferredDate ? new Date(input.preferredDate) : null,
        preferredTime: input.preferredTime || null,
        location: input.location || null,
        description: input.description,
        contactMethod: input.contactMethod || 'PLATFORM_MESSAGE',
        status: 'PENDING',
        createdAt: ts,
        updatedAt: ts,
      });

      const [inquiry] = await db
        .select()
        .from(communityServiceInquiries)
        .where(eq(communityServiceInquiries.id, inquiryId))
        .limit(1);

      revalidateAdminChanges();
      return { success: true, inquiry };
    }),

  listInquiries: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/inquiries',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(ListInquiriesInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conditions = [
        eq(communityServiceInquiries.tenantId, tenantId),
        eq(communityServiceInquiries.inquirerId, ctx.userId!),
      ];

      if (input.status && input.status !== 'ALL') {
        conditions.push(
          eq(
            communityServiceInquiries.status,
            input.status as (typeof communityServiceInquiries.status.enumValues)[number]
          )
        );
      }

      const inquiries = await db
        .select()
        .from(communityServiceInquiries)
        .where(and(...conditions))
        .orderBy(desc(communityServiceInquiries.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityServiceInquiries)
        .where(and(...conditions));

      return {
        inquiries,
        pagination: {
          total: totalResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < (totalResult?.count || 0),
        },
      };
    }),

  listProviderInquiries: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/provider/inquiries',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(ListInquiriesInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const providerListings = await db
        .select({ id: communityServiceListings.id })
        .from(communityServiceListings)
        .where(
          and(
            eq(communityServiceListings.providerId, ctx.userId!),
            eq(communityServiceListings.tenantId, tenantId)
          )
        );

      const listingIds = providerListings.map(l => l.id);

      if (listingIds.length === 0) {
        return {
          inquiries: [],
          pagination: { total: 0, limit: input.limit, offset: input.offset, hasMore: false },
        };
      }

      const conditions: ReturnType<typeof eq>[] = [
        inArray(communityServiceInquiries.listingId, listingIds),
      ];

      if (input.status && input.status !== 'ALL') {
        conditions.push(
          eq(
            communityServiceInquiries.status,
            input.status as (typeof communityServiceInquiries.status.enumValues)[number]
          )
        );
      }

      const inquiries = await db
        .select({
          id: communityServiceInquiries.id,
          listingId: communityServiceInquiries.listingId,
          inquirerId: communityServiceInquiries.inquirerId,
          serviceType: communityServiceInquiries.serviceType,
          preferredDate: communityServiceInquiries.preferredDate,
          preferredTime: communityServiceInquiries.preferredTime,
          location: communityServiceInquiries.location,
          description: communityServiceInquiries.description,
          contactMethod: communityServiceInquiries.contactMethod,
          status: communityServiceInquiries.status,
          providerResponse: communityServiceInquiries.providerResponse,
          respondedAt: communityServiceInquiries.respondedAt,
          createdAt: communityServiceInquiries.createdAt,
          listing: {
            id: communityServiceListings.id,
            title: communityServiceListings.title,
            category: communityServiceListings.category,
          },
          inquirer: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(communityServiceInquiries)
        .leftJoin(
          communityServiceListings,
          eq(communityServiceInquiries.listingId, communityServiceListings.id)
        )
        .leftJoin(users, eq(communityServiceInquiries.inquirerId, users.id))
        .where(and(...conditions))
        .orderBy(desc(communityServiceInquiries.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityServiceInquiries)
        .where(and(...conditions));

      return {
        inquiries,
        pagination: {
          total: totalResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < (totalResult?.count || 0),
        },
      };
    }),

  respondToInquiry: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/provider/inquiries/{id}/respond',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(RespondToInquiryInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [inquiry] = await db
        .select({
          id: communityServiceInquiries.id,
          listingId: communityServiceInquiries.listingId,
        })
        .from(communityServiceInquiries)
        .innerJoin(
          communityServiceListings,
          and(
            eq(communityServiceInquiries.listingId, communityServiceListings.id),
            eq(communityServiceListings.tenantId, tenantId)
          )
        )
        .where(eq(communityServiceInquiries.id, input.id))
        .limit(1);

      if (!inquiry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Inquiry not found' });
      }

      const [listing] = await db
        .select({ providerId: communityServiceListings.providerId })
        .from(communityServiceListings)
        .where(
          and(
            eq(communityServiceListings.id, inquiry.listingId),
            eq(communityServiceListings.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!listing || listing.providerId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      await db
        .update(communityServiceInquiries)
        .set({
          providerResponse: input.response || null,
          status: input.status || 'RESPONDED',
          respondedAt: now(),
          updatedAt: now(),
        })
        .where(
          and(
            eq(communityServiceInquiries.id, input.id),
            eq(communityServiceInquiries.tenantId, tenantId)
          )
        );

      const [updated] = await db
        .select()
        .from(communityServiceInquiries)
        .where(eq(communityServiceInquiries.id, input.id))
        .limit(1);

      revalidateAdminChanges();
      return { success: true, inquiry: updated };
    }),

  // ────────── REVIEWS ──────────

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

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communityServiceReviews)
        .where(
          and(
            eq(communityServiceReviews.listingId, input.listingId),
            eq(communityServiceReviews.isPublished, true),
            eq(communityServiceReviews.tenantId, tenantId)
          )
        );

      const [ratingStats] = await db
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

      return {
        reviews,
        stats: {
          averageRating: Number(ratingStats?.avgRating) || 0,
          averageResponse: Number(ratingStats?.avgResponse) || 0,
          totalReviews: ratingStats?.count || 0,
        },
        pagination: {
          total: totalResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < (totalResult?.count || 0),
        },
      };
    }),

  createReview: protectedProcedure
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
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

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
            eq(communityServiceReviews.reviewerId, ctx.userId!)
          )
        )
        .limit(1);

      if (existingReview) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have already reviewed this service',
        });
      }

      const reviewId = crypto.randomUUID();
      const ts = now();

      await db.insert(communityServiceReviews).values({
        id: reviewId,
        tenantId,
        listingId: input.listingId,
        reviewerId: ctx.userId!,
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
      return { success: true, review };
    }),

  // ────────── MODERATION ──────────

  listModerationQueue: adminProcedure
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
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

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

      return {
        listings,
        pagination: {
          total: totalResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < (totalResult?.count || 0),
        },
      };
    }),

  moderateListing: adminProcedure
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
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      await getTenantListing(input.id, tenantId);

      const isActive = input.status === 'ACTIVE';
      await db
        .update(communityServiceListings)
        .set({
          status: input.status,
          isPublished: input.isPublished ?? isActive,
          moderatedBy: ctx.userId!,
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
      return { success: true, listing };
    }),

  // ────────── RELATED LISTINGS ──────────

  getRelatedListings: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/listings/{id}/related',
        protect: false,
        tags: ['marketplace'],
      },
    })
    .input(z.object({ serviceId: z.string(), limit: z.number().int().positive().default(4) }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [current] = await db
        .select({ category: communityServiceListings.category })
        .from(communityServiceListings)
        .where(
          and(
            eq(communityServiceListings.id, input.serviceId),
            eq(communityServiceListings.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!current) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Service not found' });
      }

      const related = await db
        .select({
          id: communityServiceListings.id,
          title: communityServiceListings.title,
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
          provider: { id: users.id, name: users.name, avatar: users.avatar },
        })
        .from(communityServiceListings)
        .leftJoin(users, eq(communityServiceListings.providerId, users.id))
        .where(
          and(
            eq(communityServiceListings.tenantId, tenantId),
            eq(communityServiceListings.isPublished, true),
            eq(communityServiceListings.status, 'ACTIVE'),
            sql`${communityServiceListings.id} != ${input.serviceId}`,
            eq(communityServiceListings.category, current.category)
          )
        )
        .orderBy(desc(communityServiceListings.rating), desc(communityServiceListings.reviewCount))
        .limit(input.limit);

      return { relatedServices: related };
    }),

  // ────────── AVAILABILITY ──────────

  getAvailability: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/listings/{id}/availability',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(IdInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [listing] = await db
        .select({
          id: communityServiceListings.id,
          availability: communityServiceListings.availability,
        })
        .from(communityServiceListings)
        .where(
          and(
            eq(communityServiceListings.id, input.id),
            eq(communityServiceListings.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!listing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Listing not found' });
      }

      interface TimeRange {
        start: string;
        end: string;
      }
      const rawAvailability = listing.availability as Record<string, unknown[]> | null;
      const availability: Record<string, TimeRange[]> = {};
      const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of DAYS) availability[day] = [];

      if (rawAvailability && typeof rawAvailability === 'object') {
        for (const [day, ranges] of Object.entries(rawAvailability)) {
          if (Array.isArray(ranges)) {
            availability[day.toLowerCase()] = ranges as TimeRange[];
          }
        }
      }

      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const existingBookings = await db
        .select({
          date: serviceBookings.date,
          startTime: serviceBookings.startTime,
          endTime: serviceBookings.endTime,
        })
        .from(serviceBookings)
        .where(
          and(
            eq(serviceBookings.listingId, input.id),
            eq(serviceBookings.tenantId, tenantId),
            ne(serviceBookings.status, 'CANCELLED'),
            sql`${serviceBookings.date} >= ${today.toISOString().split('T')[0]}`,
            sql`${serviceBookings.date} <= ${thirtyDaysFromNow.toISOString().split('T')[0]}`
          )
        );

      const bookedSlots = existingBookings.map(b => ({
        date: b.date instanceof Date ? b.date.toISOString().split('T')[0] : String(b.date),
        startTime: b.startTime,
        endTime: b.endTime,
      }));

      return { availability, bookedSlots };
    }),

  // ────────── CHECKOUT ──────────

  createCheckoutSession: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/checkout',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(checkoutRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [booking] = await db
        .select()
        .from(serviceBookings)
        .where(eq(serviceBookings.id, input.bookingId))
        .limit(1);

      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      if (booking.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your booking' });
      }

      if (booking.tenantId !== tenantId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      if (booking.status !== 'PENDING_CONFIRMATION') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Booking is not in a payable state' });
      }

      const flags = await getPlatformPageFlags(tenantId);
      const gateway = input.gateway ?? 'paystack';

      const result = await initializeCheckout({
        booking: {
          id: booking.id,
          tenantId: booking.tenantId,
          providerId: booking.providerId,
          userId: booking.userId,
          price: Number(booking.price ?? 0),
          listingId: booking.listingId,
        },
        listing: {
          id: booking.listingId,
          title: '',
          priceType: 'FIXED',
        },
        userEmail: ctx.session?.user?.email ?? '',
        flags,
        gateway,
      });

      if (result.status === 'configuration_required') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: result.message ?? 'Payment gateway not available',
        });
      }

      return {
        paymentUrl: result.paymentUrl,
        reference: result.reference,
      };
    }),

  // ────────── WEBHOOK ──────────

  handleWebhook: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/webhook',
        protect: false,
        tags: ['marketplace'],
      },
    })
    .input(WebhookInput)
    .mutation(async ({ input }) => {
      const { body, signature } = input;

      if (!signature) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing signature' });
      }

      const paystack = new PaystackService();
      const verification = paystack.verifyWebhookSignature(body, signature);
      if (!verification.verified) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid signature' });
      }

      let event: { event?: string; data?: { reference?: string; status?: string; id?: string } };
      try {
        event = JSON.parse(body);
      } catch {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid JSON body' });
      }

      const reference = event.data?.reference;
      if (!reference?.startsWith('svc-')) {
        return { status: 'ignored' };
      }

      const bookingId = reference.replace('svc-', '');

      const [booking] = await db
        .select()
        .from(serviceBookings)
        .where(eq(serviceBookings.id, bookingId))
        .limit(1);

      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      if (booking.status === 'CONFIRMED') {
        return { status: 'already_processed' };
      }

      if (event.event === 'charge.success') {
        await db
          .update(serviceBookings)
          .set({
            status: 'CONFIRMED',
            paymentStatus: 'COMPLETED',
            updatedAt: now(),
          })
          .where(eq(serviceBookings.id, bookingId));

        await db
          .update(paymentTransactions)
          .set({ status: 'COMPLETED' })
          .where(eq(paymentTransactions.externalRef, reference));

        notifyPaymentReceived({
          tenantId: booking.tenantId,
          providerId: booking.providerId,
          listingId: booking.listingId,
          listingTitle: 'Service Booking',
          amount: Number(booking.price ?? 0),
          transactionId: event.data?.id ?? reference,
        }).catch(() => {});
      } else if (event.event === 'charge.failed') {
        await db
          .update(serviceBookings)
          .set({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paymentStatus: 'FAILED' as any,
            updatedAt: now(),
          })
          .where(eq(serviceBookings.id, bookingId));

        await db
          .update(paymentTransactions)
          .set({ status: 'FAILED' })
          .where(eq(paymentTransactions.externalRef, reference));
      }

      return { status: 'processed' };
    }),

  // ────────── SERVICE BOOKINGS ──────────

  listServiceBookings: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/bookings',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(ListServiceBookingsInput)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const conditions = [eq(serviceBookings.tenantId, tenantId)];

      if (input.role === 'provider') {
        const userEmail = ctx.session?.user?.email ?? '';
        const provider = await getProviderRecordForUser(tenantId, userEmail);
        if (!provider) {
          return {
            bookings: [],
            pagination: { total: 0, limit: input.limit, offset: input.offset, hasMore: false },
          };
        }
        conditions.push(eq(serviceBookings.providerId, provider.id));
      } else {
        conditions.push(eq(serviceBookings.userId, ctx.userId!));
      }

      const bookingsData = await db
        .select({
          id: serviceBookings.id,
          tenantId: serviceBookings.tenantId,
          listingId: serviceBookings.listingId,
          providerId: serviceBookings.providerId,
          userId: serviceBookings.userId,
          date: serviceBookings.date,
          startTime: serviceBookings.startTime,
          endTime: serviceBookings.endTime,
          price: serviceBookings.price,
          platformFee: serviceBookings.platformFee,
          paymentStatus: serviceBookings.paymentStatus,
          status: serviceBookings.status,
          createdAt: serviceBookings.createdAt,
          updatedAt: serviceBookings.updatedAt,
          listingTitle: communityServiceListings.title,
          listingCategory: communityServiceListings.category,
          userName: users.name,
          userEmail: users.email,
        })
        .from(serviceBookings)
        .leftJoin(
          communityServiceListings,
          eq(serviceBookings.listingId, communityServiceListings.id)
        )
        .leftJoin(users, eq(serviceBookings.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(serviceBookings.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(serviceBookings)
        .where(and(...conditions));

      return {
        bookings: bookingsData,
        pagination: {
          total: totalResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < (totalResult?.count || 0),
        },
      };
    }),

  createServiceBooking: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/bookings',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(serviceBookingSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const { listingId, date, startTime, endTime } = input;

      const [listing] = await db
        .select({
          id: communityServiceListings.id,
          providerId: communityServiceListings.providerId,
          price: communityServiceListings.price,
          priceType: communityServiceListings.priceType,
          isPublished: communityServiceListings.isPublished,
          tenantId: communityServiceListings.tenantId,
        })
        .from(communityServiceListings)
        .where(
          and(
            eq(communityServiceListings.id, listingId),
            eq(communityServiceListings.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!listing || !listing.isPublished) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Service listing not found' });
      }

      const providerId = listing.providerId;

      if (providerId === ctx.userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot book your own service' });
      }

      const [conflicting] = await db
        .select({ id: serviceBookings.id })
        .from(serviceBookings)
        .where(
          and(
            eq(serviceBookings.listingId, listingId),
            eq(serviceBookings.date, new Date(date)),
            eq(serviceBookings.startTime, startTime),
            ne(serviceBookings.status, 'CANCELLED')
          )
        )
        .limit(1);

      if (conflicting) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This time slot is no longer available. Please choose another time.',
        });
      }

      const bookingPrice = listing.price ? Number(listing.price) : 0;
      const platformFeeAmount = await calculatePlatformFee(providerId, bookingPrice);

      const bookingId = crypto.randomUUID();
      const ts = now();

      await db.insert(serviceBookings).values({
        id: bookingId,
        tenantId,
        listingId,
        providerId,
        userId: ctx.userId!,
        date: new Date(date),
        startTime,
        endTime,
        price: String(bookingPrice),
        platformFee: String(platformFeeAmount),
        paymentStatus: 'PENDING',
        status: 'PENDING_CONFIRMATION',
        createdAt: ts,
        updatedAt: ts,
      });

      const [created] = await db
        .select()
        .from(serviceBookings)
        .where(eq(serviceBookings.id, bookingId))
        .limit(1);

      return { success: true, booking: created };
    }),

  getServiceBooking: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/bookings/{bookingId}',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(BookingIdParam)
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [booking] = await db
        .select()
        .from(serviceBookings)
        .where(
          and(
            eq(serviceBookings.id, input.bookingId),
            eq(serviceBookings.tenantId, tenantId),
            or(eq(serviceBookings.userId, ctx.userId!), eq(serviceBookings.providerId, ctx.userId!))
          )
        )
        .limit(1);

      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      return { booking };
    }),

  cancelServiceBooking: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/bookings/{bookingId}/cancel',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(CancelBookingInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [booking] = await db
        .select()
        .from(serviceBookings)
        .where(and(eq(serviceBookings.id, input.bookingId), eq(serviceBookings.tenantId, tenantId)))
        .limit(1);

      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }

      const allowedTransitions = ['PENDING_CONFIRMATION', 'CONFIRMED'] as const;
      if (!allowedTransitions.includes(booking.status as (typeof allowedTransitions)[number])) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot cancel booking in status ${booking.status}`,
        });
      }

      const isBookingUser = booking.userId === ctx.userId;
      const provider = await getProviderRecordForUser(tenantId, ctx.session?.user?.email ?? '');
      const isProvider = provider?.id === booking.providerId;

      if (!isBookingUser && !isProvider) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to cancel this booking',
        });
      }

      await db
        .update(serviceBookings)
        .set({ status: 'CANCELLED', updatedAt: now() })
        .where(
          and(eq(serviceBookings.id, input.bookingId), eq(serviceBookings.tenantId, tenantId))
        );

      const [updated] = await db
        .select()
        .from(serviceBookings)
        .where(eq(serviceBookings.id, input.bookingId))
        .limit(1);

      return { success: true, booking: updated };
    }),

  // ────────── URGENCY ──────────

  getUrgencyLevels: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/urgency',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const today = now();
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      try {
        const [openMaintenanceResult, upcomingBookingsResult] = await Promise.all([
          db
            .select({ count: count() })
            .from(maintenanceRequests)
            .where(
              and(
                eq(maintenanceRequests.tenantId, tenantId),
                eq(maintenanceRequests.status, 'SUBMITTED'),
                eq(maintenanceRequests.userId, ctx.userId!)
              )
            ),
          db
            .select({ count: count() })
            .from(bookings)
            .where(
              and(
                eq(bookings.tenantId, tenantId),
                gte(bookings.date, today),
                lte(bookings.date, sevenDaysFromNow)
              )
            ),
        ]);

        const extractCount = (result: { count: number }[]) => result[0]?.count ?? 0;

        const openMaintenance = extractCount(openMaintenanceResult);
        const upcomingBookings = extractCount(upcomingBookingsResult);

        return {
          commandBar: {
            openMaintenance,
            upcomingBookings,
          },
          domainBadges: {
            maintenance: openMaintenance,
            bookings: upcomingBookings,
            amenities: 0,
            'my-services': 0,
            events: 0,
          },
        };
      } catch (error) {
        UrgencyLogger.error(
          { operation: 'getUrgencyLevels' },
          'Failed to get urgency counts',
          error
        );
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get urgency levels',
        });
      }
    }),

  // ────────── PREMIUM LISTINGS ──────────

  listPremiumListings: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/premium/listings',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const linkedProperties = await db
        .select({ id: properties.id })
        .from(properties)
        .innerJoin(propertyPremiumSeats, eq(properties.id, propertyPremiumSeats.propertyId))
        .innerJoin(premiumSeats, eq(premiumSeats.id, propertyPremiumSeats.premiumSeatId))
        .where(and(eq(premiumSeats.userId, ctx.userId!), eq(premiumSeats.tenantId, tenantId)));

      if (!linkedProperties.length) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Premium Seat required to access listings',
        });
      }

      const propertyIds = linkedProperties.map(p => p.id);

      const listings = await db
        .select({
          listing: propertyListings,
          property: properties,
        })
        .from(propertyListings)
        .innerJoin(properties, eq(propertyListings.propertyId, properties.id))
        .where(
          and(
            eq(propertyListings.ownerId, ctx.userId!),
            eq(propertyListings.tenantId, tenantId),
            sql`${propertyListings.propertyId} = ANY((${sql.join(
              propertyIds.map(id => sql`${id}`),
              sql`, `
            )})::text[])`
          )
        )
        .orderBy(desc(propertyListings.createdAt));

      const transformedListings = listings.map(l => ({
        ...l.listing,
        street: l.property.street,
        unit: l.property.unit,
        homeImage: l.property.homeImage,
      }));

      return { listings: transformedListings };
    }),

  createPremiumListing: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/premium/listings',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(CreatePremiumListingInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const [premiumSeatExists] = await db
        .select({ id: premiumSeats.id })
        .from(premiumSeats)
        .where(and(eq(premiumSeats.userId, ctx.userId!), eq(premiumSeats.tenantId, tenantId)))
        .limit(1);

      if (!premiumSeatExists) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Premium Seat required to create listings',
        });
      }

      const [newListing] = await db
        .insert(propertyListings)
        .values({
          id: crypto.randomUUID(),
          tenantId,
          propertyId: input.propertyId,
          ownerId: ctx.userId!,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          listingType: (input.listingType || 'SALE') as any,
          title: input.title,
          description: input.description ?? null,
          bedrooms: input.bedrooms ?? null,
          bathrooms: input.bathrooms ?? null,
          parkingSpaces: input.parkingSpaces ?? null,
          gardenSize: input.gardenSize ?? null,
          petFriendly: input.petFriendly ?? false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: 'DRAFT' as any,
          isPublished: false,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning();

      return { success: true, listing: newListing };
    }),

  // ────────── PREMIUM PORTFOLIO ──────────

  getPortfolio: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/premium/portfolio',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const portfolioResult = await db.execute(
        sql`SELECT * FROM "PremiumSeat" WHERE "userId" = ${ctx.userId!} AND "tenantId" = ${tenantId} LIMIT 1`
      );

      if (!portfolioResult.rows?.length) {
        return { hasPortfolio: false, message: 'No Premium Seat portfolio found' };
      }

      return { hasPortfolio: true, portfolio: portfolioResult.rows[0] };
    }),

  upgradePortfolio: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/marketplace/premium/portfolio/upgrade',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .input(UpgradePortfolioInput)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tenant context required' });
      }

      const userId = ctx.userId!;
      const { householdIds } = input;

      const householdsResult = (await db.execute(sql`
        SELECT h.*
        FROM "Household" h
        JOIN "StandardSeat" ss ON ss."householdId" = h.id
        WHERE h.id IN ${sql`${householdIds}`}
        AND h."tenantId" = ${tenantId}
        AND ss."userId" = ${userId}
        AND ss."isPrimaryOwner" = true
      `)) as { rows: { id: string }[] };

      if ((householdsResult.rows?.length || 0) !== householdIds.length) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not own all specified households',
        });
      }

      const [existingPremiumSeat] = await db
        .select({ id: premiumSeats.id })
        .from(premiumSeats)
        .where(and(eq(premiumSeats.userId, userId), eq(premiumSeats.tenantId, tenantId)))
        .limit(1);

      if (existingPremiumSeat) {
        for (const householdId of householdIds) {
          await db.execute(sql`
            INSERT INTO "_PremiumSeatPortfolio" ("A", "B")
            VALUES (${existingPremiumSeat.id}, ${householdId})
            ON CONFLICT DO NOTHING
          `);
        }
      } else {
        const userResult = (await db.execute(sql`
          SELECT email, name FROM "user" WHERE id = ${userId}
        `)) as { rows: { email: string; name: string | null }[] };

        if (!userResult.rows?.length) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        const user = userResult.rows[0];
        const platformAddress = `${(user.name || '').toLowerCase().replace(/\s+/g, '.')}@sorialia.org`;

        try {
          await assertAddressUnique(platformAddress, db);
        } catch (e) {
          throw new TRPCError({ code: 'CONFLICT', message: (e as Error).message });
        }

        const newPremiumSeat = (await db.execute(sql`
          INSERT INTO "PremiumSeat" ("userId", "tenantId", "platformAddress")
          VALUES (${userId}, ${tenantId}, ${platformAddress})
          RETURNING id
        `)) as { rows: { id: string }[] };

        for (const householdId of householdIds) {
          await db.execute(sql`
            INSERT INTO "_PremiumSeatPortfolio" ("A", "B")
            VALUES (${newPremiumSeat.rows?.[0]?.id}, ${householdId})
            ON CONFLICT DO NOTHING
          `);
        }
      }

      const portfolioResult = (await db.execute(sql`
        SELECT
          ps.*,
          json_agg(
            json_build_object(
              'id', h.id,
              'street', h.street,
              'unit', h.unit,
              'homeImage', h."homeImage"
            )
          ) FILTER (WHERE h.id IS NOT NULL) as "linkedHouseholds"
        FROM "PremiumSeat" ps
        JOIN "_PremiumSeatPortfolio" htl ON htl.A = ps.id
        JOIN "Household" h ON h.id = htl.B
        WHERE ps."userId" = ${userId}
        AND ps."tenantId" = ${tenantId}
        GROUP BY ps.id
      `)) as { rows: { linkedHouseholds: { id: string; street: string; unit: string }[] }[] };

      return {
        success: true,
        message: 'Successfully upgraded to Premium Seat with property portfolio',
        portfolio: portfolioResult.rows?.[0],
      };
    }),

  // ────────── ANALYTICS ──────────

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

      return {
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
      };
    }),
});
