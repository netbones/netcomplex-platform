import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, premiumSeats } from '@/lib/db';
import { eq, sql, and } from 'drizzle-orm';
import { withTenant } from '@/lib/tenant/with-tenant';

/**
 * POST /api/premium/upgrade-portfolio - Upgrade to Premium Seat with multi-property portfolio
 * Body: { householdIds: string[] } - Array of household IDs to include in portfolio
 */
export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { householdIds } = await request.json();

    if (!Array.isArray(householdIds) || householdIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 household IDs required for portfolio upgrade' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Verify user owns all specified households via raw SQL
    const householdsResult = (await db.execute(sql`
      SELECT h.* 
      FROM "household" h
      JOIN "standardSeat" ss ON ss."householdId" = h.id
      WHERE h.id IN ${sql`${householdIds}`}
      AND h."tenantId" = ${tenantId}
      AND ss."userId" = ${userId}
      AND ss."isPrimaryOwner" = true
    `)) as any;

    if ((householdsResult.rows?.length || 0) !== householdIds.length) {
      return NextResponse.json(
        { error: 'You do not own all specified households' },
        { status: 403 }
      );
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
      `)) as any;

      if (!userResult.rows?.length) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = userResult.rows[0];
      const platformAddress = `${(user.name || '').toLowerCase().replace(/\s+/g, '.')}@sorialia.org`;

      // Create new Premium Seat
      const newPremiumSeat = (await db.execute(sql`
        INSERT INTO "premiumSeat" ("userId", "tenantId", "platformAddress")
        VALUES (${userId}, ${tenantId}, ${platformAddress})
        RETURNING id
      `)) as any;

      // Link households
      for (const householdId of householdIds) {
        await db.execute(sql`
          INSERT INTO "_PremiumSeatPortfolio" ("A", "B")
          VALUES (${newPremiumSeat.rows?.[0]?.id}, ${householdId})
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
              FROM "standardSeat" ss
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
              FROM "profile" p
              JOIN "user" u ON u.id = p."userId"
              WHERE p."householdId" = h.id
            )
          )
        ) FILTER (WHERE h.id IS NOT NULL) as "linkedHouseholds"
      FROM "premiumSeat" ps
      JOIN "_PremiumSeatPortfolio" htl ON htl.A = ps.id
      JOIN "household" h ON h.id = htl.B
      WHERE ps."userId" = ${userId}
      AND ps."tenantId" = ${tenantId}
      GROUP BY ps.id
    `)) as any;

    return NextResponse.json({
      success: true,
      message: 'Successfully upgraded to Premium Seat with property portfolio',
      portfolio: portfolioResult.rows?.[0],
    });
  } catch (error) {
    console.error('Premium upgrade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/premium/portfolio - Get user's premium portfolio
 */
export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await withTenant();
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
              FROM "standardSeat" ss
              JOIN "user" u ON u.id = ss."userId"
              WHERE ss."householdId" = h.id
            ),
            'profiles', (
              SELECT json_agg(
                json_build_object(
                  'id', p.id,
                  'user', json_build_object('id', u.id, 'name', u.name)
                )
              )
              FROM "profile" p
              JOIN "user" u ON u.id = p."userId"
              WHERE p."householdId" = h.id
            )
          )
        ) FILTER (WHERE h.id IS NOT NULL) as "linkedHouseholds"
      FROM "premiumSeat" ps
      JOIN "_PremiumSeatPortfolio" htl ON htl.A = ps.id
      JOIN "household" h ON h.id = htl.B
      WHERE ps."userId" = ${session.user.id}
      AND ps."tenantId" = ${tenantId}
      GROUP BY ps.id
    `)) as any;

    if (!portfolioResult.rows?.length) {
      return NextResponse.json({
        hasPortfolio: false,
        message: 'No Premium Seat portfolio found',
      });
    }

    return NextResponse.json({
      hasPortfolio: true,
      portfolio: portfolioResult.rows[0],
    });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
