import {
  tenantProcedure,
  db,
  communityServiceListings,
  communityServiceInquiries,
  users,
  now,
  revalidateAdminChanges,
} from '@api/server';
import { toEnvelope } from '@api/server';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { CreateInquiryInput, ListInquiriesInput, RespondToInquiryInput } from './shared';

export const inquiryProcedures = {
  createInquiry: tenantProcedure
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
        inquirerId: ctx.userId,
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
      return toEnvelope({ success: true, inquiry });
    }),

  listInquiries: tenantProcedure
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

      const conditions = [
        eq(communityServiceInquiries.tenantId, tenantId),
        eq(communityServiceInquiries.inquirerId, ctx.userId),
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

      return toEnvelope({
        inquiries,
        pagination: {
          total: totalResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < (totalResult?.count || 0),
        },
      });
    }),

  listProviderInquiries: tenantProcedure
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

      const providerListings = await db
        .select({ id: communityServiceListings.id })
        .from(communityServiceListings)
        .where(
          and(
            eq(communityServiceListings.providerId, ctx.userId),
            eq(communityServiceListings.tenantId, tenantId)
          )
        );

      const listingIds = providerListings.map(l => l.id);

      if (listingIds.length === 0) {
        return toEnvelope({
          inquiries: [],
          pagination: { total: 0, limit: input.limit, offset: input.offset, hasMore: false },
        });
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

      return toEnvelope({
        inquiries,
        pagination: {
          total: totalResult?.count || 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < (totalResult?.count || 0),
        },
      });
    }),

  respondToInquiry: tenantProcedure
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
      return toEnvelope({ success: true, inquiry: updated });
    }),
};
