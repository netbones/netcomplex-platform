import { z } from 'zod';
import {
  agentAccesses,
  db,
  households,
  notDeleted,
  now,
  privilegedProcedure,
  profiles,
  properties,
  residentDelegations,
  router,
  standardSeats,
  tenantProcedure,
  users,
  contents,
} from '@api/server';
import { toEnvelope } from '@api/server';

import { TRPCError } from '@trpc/server';

import { eq, and, asc, desc, count, isNull, inArray } from 'drizzle-orm';
import { hasPermission } from '@shared/lib';
import { logDelegationAction } from '@api/shared/delegations';
import { SCOPE_BUNDLES, validateScopes } from '@entities/agent';
import { createPrefixedId, createId } from '@shared/lib/id';

export const householdsRouter = router({
  getStreets: tenantProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
    }

    const rows = await db
      .selectDistinct({ street: properties.street })
      .from(properties)
      .where(and(eq(properties.tenantId, tenantId), notDeleted(properties)))
      .orderBy(properties.street);

    return toEnvelope(rows.map(r => r.street));
  }),

  listHouseholds: privilegedProcedure
    .input(
      z.object({
        page: z.number().optional(),
        limit: z.number().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
      }

      if (!hasPermission(ctx.role ?? 'RESIDENT', 'households')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      const page = input.page || 1;
      const limit = Math.min(input.limit || 20, 50);
      const skip = (page - 1) * limit;
      const search = input.search || '';

      const totalResult = await db
        .select({ total: count() })
        .from(households)
        .where(and(eq(households.tenantId, tenantId), notDeleted(households)));

      const total = totalResult[0]?.total || 0;

      const householdList = await db
        .select({
          id: households.id,
          propertyId: households.propertyId,
          street: properties.street,
          unit: properties.unit,
          homeImage: properties.homeImage,
          platformAddress: properties.platformAddress,
          status: households.status,
          createdAt: households.createdAt,
        })
        .from(households)
        .innerJoin(properties, eq(households.propertyId, properties.id))
        .where(and(eq(households.tenantId, tenantId), notDeleted(households)))
        .orderBy(desc(households.createdAt))
        .limit(limit)
        .offset(skip);

      const householdsWithOccupants = await Promise.all(
        householdList.map(async household => {
          const [seatCount] = await db
            .select({ count: count() })
            .from(standardSeats)
            .where(
              and(
                eq(standardSeats.propertyId, household.propertyId),
                eq(standardSeats.tenantId, tenantId)
              )
            );

          const [profileCount] = await db
            .select({ count: count() })
            .from(profiles)
            .where(and(eq(profiles.householdId, household.id), eq(profiles.tenantId, tenantId)));

          const [primaryOwner] = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(standardSeats)
            .innerJoin(users, eq(standardSeats.userId, users.id))
            .where(
              and(
                eq(standardSeats.propertyId, household.propertyId),
                eq(standardSeats.isPrimaryOwner, true),
                eq(standardSeats.tenantId, tenantId)
              )
            )
            .limit(1);

          return {
            ...household,
            occupantCount: (seatCount?.count || 0) + (profileCount?.count || 0),
            primaryOwner: primaryOwner || null,
          };
        })
      );

      const filtered = search
        ? householdsWithOccupants.filter(
            h =>
              h.street.toLowerCase().includes(search.toLowerCase()) ||
              h.unit.toLowerCase().includes(search.toLowerCase()) ||
              h.primaryOwner?.name?.toLowerCase().includes(search.toLowerCase())
          )
        : householdsWithOccupants;

      return toEnvelope({
        households: filtered,
        total: search ? filtered.length : total,
        page,
        limit,
      });
    }),

  getHousehold: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
      }

      const [householdData] = await db
        .select({
          id: households.id,
          propertyId: households.propertyId,
          street: properties.street,
          unit: properties.unit,
          homeImage: properties.homeImage,
          platformAddress: properties.platformAddress,
          status: households.status,
          createdAt: households.createdAt,
        })
        .from(households)
        .innerJoin(properties, eq(households.propertyId, properties.id))
        .where(
          and(
            notDeleted(households),
            eq(households.id, input.id),
            eq(households.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!householdData) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      const seats = await db
        .select({
          id: standardSeats.id,
          userId: standardSeats.userId,
          isPrimaryOwner: standardSeats.isPrimaryOwner,
          platformAddress: standardSeats.platformAddress,
          propertyId: standardSeats.propertyId,
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatar: users.avatar,
          isPublic: users.isPublic,
          showEmail: users.showEmail,
          showPhone: users.showPhone,
        })
        .from(standardSeats)
        .leftJoin(users, eq(standardSeats.userId, users.id))
        .where(
          and(
            eq(standardSeats.propertyId, householdData.propertyId),
            eq(standardSeats.tenantId, tenantId)
          )
        );

      const profileList = await db
        .select({
          id: profiles.id,
          householdId: profiles.householdId,
          displayName: profiles.displayName,
          profileAddress: profiles.profileAddress,
          avatar: profiles.avatar,
          isPublic: profiles.isPublic,
          occupantSince: profiles.occupantSince,
          householdRole: profiles.householdRole,
          userId: profiles.userId,
        })
        .from(profiles)
        .where(and(eq(profiles.householdId, input.id), eq(profiles.tenantId, tenantId)))
        .orderBy(asc(profiles.occupantSince));

      const userIds = [
        ...seats.map(s => s.userId).filter(Boolean),
        ...profileList.map(p => p.userId).filter(Boolean),
      ] as string[];

      interface ContentItem {
        id: string;
        title: unknown;
        excerpt: unknown;
        content: unknown;
        category: string;
        tags: string[];
        publishedAt: Date | null;
        createdAt: Date;
        authorId: string | null;
        author?: {
          id: string;
          name: string;
          type: 'member' | 'occupant';
          isPrimaryOwner?: boolean;
          profileId?: string;
        };
      }
      const userContentsMap: Record<string, ContentItem[]> = {};

      if (userIds.length > 0) {
        const allContents = await db
          .select({
            id: contents.id,
            title: contents.title,
            excerpt: contents.excerpt,
            content: contents.content,
            category: contents.category,
            tags: contents.tags,
            publishedAt: contents.publishedAt,
            createdAt: contents.createdAt,
            authorId: contents.authorId,
          })
          .from(contents)
          .where(and(eq(contents.published, true), eq(contents.tenantId, tenantId)));

        for (const content of allContents) {
          if (content.authorId) {
            if (!userContentsMap[content.authorId]) {
              userContentsMap[content.authorId] = [];
            }
            userContentsMap[content.authorId].push(content);
          }
        }
      }

      const allContent: ContentItem[] = [];

      seats.forEach(seat => {
        const contentsForUser = userContentsMap[seat.userId] || [];
        contentsForUser.forEach(content => {
          allContent.push({
            ...content,
            author: {
              id: seat.userId,
              name: seat.name || '',
              type: 'member',
              isPrimaryOwner: seat.isPrimaryOwner,
            },
          });
        });
      });

      profileList.forEach(profile => {
        const contentsForUser = userContentsMap[profile.userId || ''] || [];
        contentsForUser.forEach(content => {
          allContent.push({
            ...content,
            author: {
              id: profile.userId || profile.id,
              name: profile.displayName,
              type: 'occupant',
              profileId: profile.id,
            },
          });
        });
      });

      allContent.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));

      const tagCounts: { [key: string]: number } = {};
      allContent.forEach(content => {
        if (content.tags && Array.isArray(content.tags)) {
          content.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      const householdTags = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      const occupants = [
        ...seats.map(seat => ({
          id: seat.userId,
          name: seat.name || '',
          email: seat.email || null,
          phone: seat.phone || null,
          avatar: seat.avatar || null,
          isPublic: seat.isPublic || false,
          showEmail: seat.showEmail || false,
          showPhone: seat.showPhone || false,
          type: 'member' as const,
          isPrimaryOwner: seat.isPrimaryOwner,
          platformAddress: seat.platformAddress,
          occupantSince: householdData.createdAt,
        })),
        ...profileList.map(profile => ({
          id: profile.userId || profile.id,
          name: profile.displayName,
          email: null,
          phone: null,
          avatar: profile.avatar || null,
          isPublic: profile.isPublic || false,
          showEmail: false,
          showPhone: false,
          type: 'occupant' as const,
          profileId: profile.id,
          platformAddress: profile.profileAddress,
          occupantSince: profile.occupantSince,
          householdRole: profile.householdRole,
        })),
      ];

      return toEnvelope({
        household: householdData,
        occupants,
        content: allContent.slice(0, 20),
        tags: householdTags,
        stats: {
          totalOccupants: seats.length + profileList.length,
          totalContent: allContent.length,
          uniqueTags: householdTags.length,
        },
      });
    }),

  updateHousehold: privilegedProcedure
    .input(
      z.object({
        id: z.string(),
        homeImage: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
      }

      const [householdData] = await db
        .select({
          id: households.id,
          propertyId: households.propertyId,
          deletedAt: households.deletedAt,
        })
        .from(households)
        .where(
          and(
            notDeleted(households),
            eq(households.id, input.id),
            eq(households.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!householdData) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Household not found' });
      }

      if (householdData.deletedAt) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'This record has been deleted' });
      }

      const [seat] = await db
        .select({ userId: standardSeats.userId })
        .from(standardSeats)
        .where(
          and(
            eq(standardSeats.propertyId, householdData.propertyId),
            eq(standardSeats.tenantId, tenantId)
          )
        )
        .limit(1);

      const isPropertyOwner = seat?.userId === ctx.userId;
      const canManageHouseholds = hasPermission(ctx.role ?? 'RESIDENT', 'households');

      if (!isPropertyOwner && !canManageHouseholds) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      if (input.homeImage !== undefined) {
        await db
          .update(properties)
          .set({ homeImage: input.homeImage })
          .where(
            and(eq(properties.id, householdData.propertyId), eq(properties.tenantId, tenantId))
          );
      }

      return toEnvelope({ success: true });
    }),

  deleteProperty: privilegedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.role ?? 'RESIDENT', 'users')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      }

      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
      }

      const [property] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(
          and(
            eq(properties.id, input.id),
            eq(properties.tenantId, tenantId),
            notDeleted(properties)
          )
        )
        .limit(1);

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      await db
        .update(properties)
        .set({ deletedAt: now(), updatedAt: now() })
        .where(eq(properties.id, property.id));

      return toEnvelope({ success: true });
    }),

  delegateProperty: tenantProcedure
    .input(
      z
        .object({
          id: z.string(),
          providerId: z.string().min(1),
          scopes: z.array(z.string().min(1)).min(1).max(25).optional(),
          bundle: z
            .enum(['letting-agent', 'maintenance-contractor', 'inspector', 'property-manager'])
            .optional(),
          expiresAt: z.string().datetime().optional(),
          contractTerms: z.string().max(2000).optional(),
        })
        .refine(d => d.scopes || d.bundle, {
          message: 'Either scopes or bundle must be provided',
        })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
      }

      const propertyId = input.id;

      const [property] = await db
        .select({ id: properties.id, ownerId: properties.ownerId })
        .from(properties)
        .where(and(eq(properties.id, propertyId), eq(properties.tenantId, tenantId)))
        .limit(1);

      if (!property) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      if (property.ownerId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the property owner can delegate access',
        });
      }

      const effectiveScopes = input.bundle ? [...SCOPE_BUNDLES[input.bundle]] : input.scopes!;

      const unknownScopes = validateScopes(effectiveScopes);
      if (unknownScopes.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unknown scopes: ${unknownScopes.join(', ')}. See AGENT_SCOPES for valid values.`,
        });
      }

      const [provider] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, input.providerId))
        .limit(1);

      if (!provider) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
      }

      if (input.providerId === ctx.userId) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Cannot delegate to yourself' });
      }

      const [existing] = await db
        .select({ id: agentAccesses.id })
        .from(agentAccesses)
        .where(
          and(
            eq(agentAccesses.tenantId, tenantId),
            eq(agentAccesses.propertyId, propertyId),
            eq(agentAccesses.agentId, input.providerId),
            inArray(agentAccesses.status, ['PENDING', 'ACTIVE'])
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An active or pending delegation already exists for this property and provider',
        });
      }

      const expiry = input.expiresAt
        ? new Date(input.expiresAt)
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      const delegationId = createPrefixedId('del');

      await db.insert(agentAccesses).values({
        id: delegationId,
        tenantId,
        agentId: input.providerId,
        propertyId,
        grantedById: ctx.userId,
        permissions: effectiveScopes,
        originalPermissions: effectiveScopes,
        status: 'PENDING',
        startedAt: new Date(),
        expiresAt: expiry,
        contractTerms: input.contractTerms ?? null,
        updatedAt: new Date(),
      });

      await logDelegationAction({
        tenantId,
        delegationId,
        action: 'created',
        actorId: ctx.userId,
        metadata: {
          scopes: effectiveScopes,
          expiresAt: expiry.toISOString(),
        },
      });

      return toEnvelope({
        id: delegationId,
        propertyId,
        providerId: input.providerId,
        permissions: effectiveScopes,
        status: 'PENDING',
        expiresAt: expiry.toISOString(),
        createdAt: new Date().toISOString(),
      });
    }),

  grantResidentDelegation: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        profileId: z.string().min(1),
        scopes: z.array(z.string().min(1)).min(1),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
      }

      const RENTER_DELEGATABLE_SCOPES = [
        'maintenance:create',
        'maintenance:read',
        'inspection:schedule',
        'inspection:view',
        'communication:notify_occupant',
      ] as const;

      type RenterScope = (typeof RENTER_DELEGATABLE_SCOPES)[number];

      const propertyId = input.id;

      const [prop] = await db
        .select({ ownerId: properties.ownerId })
        .from(properties)
        .where(and(eq(properties.id, propertyId), eq(properties.tenantId, tenantId)))
        .limit(1);

      if (!prop || prop.ownerId !== ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the property owner can grant resident delegations',
        });
      }

      const invalidScopes = input.scopes.filter(
        s => !RENTER_DELEGATABLE_SCOPES.includes(s as RenterScope)
      );
      if (invalidScopes.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            `These scopes cannot be delegated to a renter: ${invalidScopes.join(', ')}. ` +
            `Allowed: ${RENTER_DELEGATABLE_SCOPES.join(', ')}`,
        });
      }

      const [profile] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .innerJoin(
          households,
          and(eq(households.propertyId, propertyId), eq(households.status, 'ACTIVE'))
        )
        .where(and(eq(profiles.id, input.profileId), eq(profiles.tenantId, tenantId)))
        .limit(1);

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found or not an active occupant of this property',
        });
      }

      await db
        .update(residentDelegations)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(residentDelegations.propertyId, propertyId),
            eq(residentDelegations.profileId, input.profileId),
            isNull(residentDelegations.revokedAt)
          )
        );

      const delegationId = createId();
      const nowDate = new Date();
      await db.insert(residentDelegations).values({
        id: delegationId,
        tenantId,
        propertyId,
        ownerId: ctx.userId,
        profileId: input.profileId,
        scopes: input.scopes,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        grantedAt: nowDate,
        createdAt: nowDate,
        updatedAt: nowDate,
      });

      return toEnvelope({
        id: delegationId,
        profileId: input.profileId,
        scopes: input.scopes,
        grantedAt: nowDate.toISOString(),
        expiresAt: input.expiresAt ?? null,
      });
    }),

  listResidentDelegations: tenantProcedure
    .input(z.object({ propertyId: z.string() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
      }

      const [prop] = await db
        .select({ ownerId: properties.ownerId })
        .from(properties)
        .where(and(eq(properties.id, input.propertyId), eq(properties.tenantId, tenantId)))
        .limit(1);

      if (!prop) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Property not found' });
      }

      const isOwner = prop.ownerId === ctx.userId;
      const isAdmin = ['ADMIN', 'BOARD'].includes(ctx.role ?? '');
      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }

      const delegations = await db
        .select({
          id: residentDelegations.id,
          profileId: residentDelegations.profileId,
          scopes: residentDelegations.scopes,
          grantedAt: residentDelegations.grantedAt,
          expiresAt: residentDelegations.expiresAt,
        })
        .from(residentDelegations)
        .where(
          and(
            eq(residentDelegations.propertyId, input.propertyId),
            eq(residentDelegations.tenantId, tenantId),
            isNull(residentDelegations.revokedAt)
          )
        )
        .orderBy(residentDelegations.grantedAt);

      return toEnvelope(
        delegations.map(d => ({
          id: d.id,
          profileId: d.profileId,
          profileName: 'Unknown',
          profileAddress: null,
          scopes: d.scopes,
          grantedAt: d.grantedAt.toISOString(),
          expiresAt: d.expiresAt?.toISOString() ?? null,
        }))
      );
    }),

  revokeResidentDelegation: tenantProcedure
    .input(
      z.object({
        propertyId: z.string(),
        delegationId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId;
      if (!tenantId) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
      }

      const [delegation] = await db
        .select({ id: residentDelegations.id })
        .from(residentDelegations)
        .where(
          and(
            eq(residentDelegations.id, input.delegationId),
            eq(residentDelegations.tenantId, tenantId),
            isNull(residentDelegations.revokedAt)
          )
        )
        .limit(1);

      if (!delegation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Delegation not found' });
      }

      const [prop] = await db
        .select({ ownerId: properties.ownerId })
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      const isOwner = prop?.ownerId === ctx.userId;
      const isAdmin = ['ADMIN', 'BOARD'].includes(ctx.role ?? '');
      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the property owner can revoke this delegation',
        });
      }

      await db
        .update(residentDelegations)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(residentDelegations.id, input.delegationId));

      return toEnvelope({ id: input.delegationId, revoked: true });
    }),
});
