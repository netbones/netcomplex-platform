import { z } from 'zod';
import {
  protectedProcedure,
  db,
  premiumSeats,
  properties,
  propertyListings,
  propertyPremiumSeats,
  now,
  assertAddressUnique,
} from '@api/server';
import { TRPCError } from '@trpc/server';
import { and, eq, desc, sql } from 'drizzle-orm';

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

export const premiumProcedures = {
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
        .where(and(eq(premiumSeats.userId, ctx.userId), eq(premiumSeats.tenantId, tenantId)));

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
            eq(propertyListings.ownerId, ctx.userId),
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
        .where(and(eq(premiumSeats.userId, ctx.userId), eq(premiumSeats.tenantId, tenantId)))
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
          ownerId: ctx.userId,
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
        sql`SELECT * FROM "PremiumSeat" WHERE "userId" = ${ctx.userId} AND "tenantId" = ${tenantId} LIMIT 1`
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

      const userId = ctx.userId;
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
        const nameSlug = (user.name || '').toLowerCase().replace(/\s+/g, '.');
        const shortId = userId.slice(0, 8);
        const platformAddress = `${nameSlug}.${shortId}@sorialia.org`;

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
};
