import { NextResponse } from 'next/server';
import { db, users, soloSeats, premiumSeats } from '@api/db';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/api/with-tenant';
import { hasPermission } from '@entities/tenant/api/permissions';
import { auth } from '@api/auth';

export const maxDuration = 8;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !hasPermission(session.user.role as string, 'users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tenantId } = await withTenant();
  const body = await request.json();
  const { userId, seatType, platformAddress, soloSeatType, portfolioName } = body;

  if (!userId || !seatType || !platformAddress) {
    return NextResponse.json(
      { error: 'userId, seatType, and platformAddress required' },
      { status: 400 }
    );
  }

  if (seatType !== 'solo' && seatType !== 'premium') {
    return NextResponse.json({ error: 'seatType must be solo or premium' }, { status: 400 });
  }

  // Verify user exists
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check if user already has a seat of this type
  if (seatType === 'solo') {
    const existing = await db
      .select({ id: soloSeats.id })
      .from(soloSeats)
      .where(eq(soloSeats.userId, userId));
    if (existing.length >= 5) {
      return NextResponse.json(
        { error: 'User already has 5 soloSeats (maximum)' },
        { status: 409 }
      );
    }

    // Check platformAddress uniqueness
    const [existingAddr] = await db
      .select({ id: soloSeats.id })
      .from(soloSeats)
      .where(eq(soloSeats.platformAddress, platformAddress))
      .limit(1);
    if (existingAddr) {
      return NextResponse.json(
        { error: `Platform address "${platformAddress}" is already allocated to another user` },
        { status: 409 }
      );
    }

    const seat = await db
      .insert(soloSeats)
      .values({
        id: crypto.randomUUID(),
        userId,
        tenantId,
        platformAddress,
        seatType: soloSeatType || 'RESIDENT',
        isComplimentary: true,
      })
      .returning()
      .then(r => r[0]);

    return NextResponse.json({ seat });
  }

  // premium
  const [existing] = await db
    .select({ id: premiumSeats.id })
    .from(premiumSeats)
    .where(eq(premiumSeats.userId, userId))
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: 'User already has a premiumSeat' }, { status: 409 });
  }

  const seat = await db
    .insert(premiumSeats)
    .values({
      id: crypto.randomUUID(),
      userId,
      tenantId,
      platformAddress,
      portfolioName: portfolioName || null,
      subscriptionTier: 'basic',
      maxProperties: 5,
      messageRetentionDays: 30,
      tier: 'foundation',
    })
    .returning()
    .then(r => r[0]);

  return NextResponse.json({ seat });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !hasPermission(session.user.role as string, 'users')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { tenantId } = await withTenant();
  const body = await request.json();
  const { userId, seatType } = body;

  if (!userId || !seatType) {
    return NextResponse.json({ error: 'userId and seatType required' }, { status: 400 });
  }

  if (seatType === 'solo') {
    const [seat] = await db
      .select({ id: soloSeats.id })
      .from(soloSeats)
      .where(and(eq(soloSeats.userId, userId), eq(soloSeats.tenantId, tenantId)))
      .limit(1);

    if (!seat) {
      return NextResponse.json({ error: 'soloSeat not found' }, { status: 404 });
    }

    await db.delete(soloSeats).where(eq(soloSeats.id, seat.id));
    return NextResponse.json({ success: true });
  }

  if (seatType === 'premium') {
    const [seat] = await db
      .select({ id: premiumSeats.id })
      .from(premiumSeats)
      .where(and(eq(premiumSeats.userId, userId), eq(premiumSeats.tenantId, tenantId)))
      .limit(1);

    if (!seat) {
      return NextResponse.json({ error: 'premiumSeat not found' }, { status: 404 });
    }

    await db.delete(premiumSeats).where(eq(premiumSeats.id, seat.id));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'seatType must be solo or premium' }, { status: 400 });
}
