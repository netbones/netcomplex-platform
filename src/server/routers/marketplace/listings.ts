import { z } from 'zod';
import {
  publicProcedure,
  protectedProcedure,
  rateLimitMiddleware,
  db,
  communityServiceListings,
  serviceBookings,
  users,
  now,
  revalidateAdminChanges,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { listingDto } from '@server/dto';
import { TRPCError } from '@trpc/server';
import { hasPermission } from '@shared/lib';
import { eq, and, desc, isNull, sql, ilike, or, ne } from 'drizzle-orm';
import {
  getServiceCategories,
  ListListingsInput,
  CreateListingInput,
  UpdateListingInput,
  PublishListingInput,
  PaginationInput,
  IdInput,
  LocaleInput,
  resolveLocaleText,
  getTenantListing,
} from './shared';

export const listingProcedures = {
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

      return toEnvelope(localized.map(l => listingDto.parse(l)));
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
            avatar: users.avatar,
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

      return toEnvelope(listingDto.parse(localized));
    }),

  createListing: protectedProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 5 }))
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
        providerId: ctx.userId,
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
      return toEnvelope(listingDto.parse(listing));
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
      return toEnvelope(listingDto.parse(listing));
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
      return toEnvelope({ success: true });
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
      return toEnvelope({ success: true });
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
        eq(communityServiceListings.providerId, ctx.userId),
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

      return toEnvelope(listings.map(l => listingDto.parse(l)));
    }),

  getCategories: protectedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/marketplace/categories',
        protect: true,
        tags: ['marketplace'],
      },
    })
    .query(async ({ ctx }) => {
      const categories = await getServiceCategories(ctx.tenantId!);
      return toEnvelope({
        categories,
        flat: [...categories.COMMUNITY, ...categories.THIRD_PARTY],
      });
    }),

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

      return toEnvelope({ relatedServices: related });
    }),

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

      return toEnvelope({ availability, bookedSlots });
    }),
};
