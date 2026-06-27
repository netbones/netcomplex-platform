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
  users,
  now,
  revalidateAdminChanges,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';

import { eq, and, desc, isNull, sql, ilike, inArray, or, ne } from 'drizzle-orm';

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
