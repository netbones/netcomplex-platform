import { NextRequest } from 'next/server';
import {
  auth,
  db,
  premiumSeats,
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiSuccess,
  apiUnauthorized,
  apiConflict,
  AddressService,
  AddressConflictError,
  AddressValidationError,
} from '@api/server';

import { eq, sql, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

/**
 * @deprecated Use trpc.marketplace.activatePremiumSeat instead.
 */
export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { householdIds } = await request.json();

    if (!Array.isArray(householdIds) || householdIds.length < 2) {
      return apiSuccess(
        { error: 'At least 2 household IDs required for portfolio upgrade' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Verify user owns all specified households via raw SQL
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
      return apiForbidden('You do not own all specified households');
    }

    // Check if user already has a Premium Seat
    const existingPremiumSeat = await db
      .select({ id: premiumSeats.id })
      .from(premiumSeats)
      .where(and(eq(premiumSeats.userId, userId), eq(premiumSeats.tenantId, tenantId)))
      .limit(1);

    if (existingPremiumSeat.length > 0) {
      // Update existing Premium Seat to include new households
      for (const householdId of householdIds) {
        await db.execute(sql`
          INSERT INTO "_PremiumSeatPortfolio" ("A", "B")
          VALUES (${existingPremiumSeat[0].id}, ${householdId})
          ON CONFLICT DO NOTHING
        `);
      }
    } else {
      // Get user info
      const userResult = (await db.execute(sql`
        SELECT email, name FROM "user" WHERE id = ${userId}
      `)) as { rows: { email: string; name: string | null }[] };

      if (!userResult.rows?.length) {
        return apiNotFound('User not found');
      }

      const user = userResult.rows[0];
      const localPart = (user.name || user.email || 'premium')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.');
      const platformAddress = await AddressService.generate('PREMIUM', tenantId, {
        custom: localPart,
      });

      // Reserve address + create PremiumSeat + backfill addressId in a single transaction
      let newSeatId: string;
      try {
        newSeatId = await db.transaction(async tx => {
          const addressService = new AddressService(tx);
          const addressRecord = await addressService.reserve(platformAddress, tenantId, 'PREMIUM', {
            ownerType: 'PREMIUM_SEAT',
            ownerId: userId,
          });

          const result = (await tx.execute(sql`
            INSERT INTO "PremiumSeat" ("userId", "tenantId", "platformAddress")
            VALUES (${userId}, ${tenantId}, ${platformAddress})
            RETURNING id
          `)) as { rows: { id: string }[] };

          const seatId = result.rows?.[0]?.id;
          if (!seatId) throw new Error('Failed to create PremiumSeat');

          await tx
            .update(premiumSeats)
            .set({ addressId: addressRecord.id as string })
            .where(eq(premiumSeats.id, seatId));

          return seatId;
        });
      } catch (e) {
        if (e instanceof AddressConflictError) return apiConflict(e.message);
        if (e instanceof AddressValidationError)
          return apiSuccess({ error: e.message }, { status: 400 });
        throw e;
      }

      // Link households
      for (const householdId of householdIds) {
        await db.execute(sql`
          INSERT INTO "_PremiumSeatPortfolio" ("A", "B")
          VALUES (${newSeatId}, ${householdId})
          ON CONFLICT DO NOTHING
        `);
      }
    }

    // Get updated portfolio data via raw SQL
    const portfolioResult = (await db.execute(sql`
      SELECT 
        ps.*,
        json_agg(
          json_build_object(
            'id', h.id,
            'street', h.street,
            'unit', h.unit,
            'homeImage', h."homeImage",
            'standardSeats', (
              SELECT json_agg(
                json_build_object(
                  'id', ss.id,
                  'user', json_build_object('id', u.id, 'name', u.name, 'email', u.email)
                )
              )
              FROM "StandardSeat" ss
              JOIN "user" u ON u.id = ss."userId"
              WHERE ss."householdId" = h.id AND ss."userId" = ${userId} AND ss."isPrimaryOwner" = true
            ),
            'profiles', (
              SELECT json_agg(
                json_build_object(
                  'id', p.id,
                  'user', json_build_object('id', u.id, 'name', u.name)
                )
              )
              FROM "Profile" p
              JOIN "user" u ON u.id = p."userId"
              WHERE p."householdId" = h.id
            )
          )
        ) FILTER (WHERE h.id IS NOT NULL) as "linkedHouseholds"
      FROM "PremiumSeat" ps
      JOIN "_PremiumSeatPortfolio" htl ON htl.A = ps.id
      JOIN "Household" h ON h.id = htl.B
      WHERE ps."userId" = ${userId}
      AND ps."tenantId" = ${tenantId}
      GROUP BY ps.id
    `)) as { rows: { linkedHouseholds: { id: string; street: string; unit: string }[] }[] };

    return apiSuccess({
      success: true,
      message: 'Successfully upgraded to Premium Seat with property portfolio',
      portfolio: portfolioResult.rows?.[0],
    });
  } catch (error) {
    logError({ component: 'portfolio-api', operation: 'POST' }, 'Premium upgrade error', error);
    return apiInternalError();
  }
}

/**
 * @deprecated Use trpc.marketplace.getPortfolio instead.
 */
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const portfolioResult = await db.execute(
      sql`SELECT * FROM "PremiumSeat" WHERE "userId" = ${session.user.id} AND "tenantId" = ${tenantId} LIMIT 1`
    );

    if (!portfolioResult.rows?.length) {
      return apiSuccess({
        hasPortfolio: false,
        message: 'No Premium Seat portfolio found',
      });
    }

    return apiSuccess({
      hasPortfolio: true,
      portfolio: portfolioResult.rows[0],
    });
  } catch (error) {
    logError({ component: 'portfolio-api', operation: 'GET' }, 'Portfolio fetch error', error);
    return apiInternalError();
  }
}
