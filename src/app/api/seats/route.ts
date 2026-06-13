import {
  db,
  users,
  soloSeats,
  premiumSeats,
  apiSuccess,
  apiConflict,
  apiCreated,
  apiForbidden,
  apiNotFound,
  apiError,
  auth,
} from '@api/server';

import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';
import { hasPermission } from '@shared/lib';

export const maxDuration = 8;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !hasPermission(session.user.role as string, 'users')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const body = await request.json();
  const { userId, seatType, platformAddress, soloSeatType, portfolioName } = body;

  if (!userId || !seatType || !platformAddress) {
    return apiError('VALIDATION_ERROR', 'userId, seatType, and platformAddress required', 400);
  }

  if (seatType !== 'solo' && seatType !== 'premium') {
    return apiError('VALIDATION_ERROR', 'seatType must be solo or premium', 400);
  }

  // Verify user exists
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
    .limit(1);

  if (!user) {
    return apiNotFound('User not found');
  }

  // Check if user already has a seat of this type
  if (seatType === 'solo') {
    const existing = await db
      .select({ id: soloSeats.id })
      .from(soloSeats)
      .where(eq(soloSeats.userId, userId));
    if (existing.length >= 5) {
      return apiConflict('User already has 5 soloSeats (maximum)');
    }

    // Check platformAddress uniqueness
    const [existingAddr] = await db
      .select({ id: soloSeats.id })
      .from(soloSeats)
      .where(eq(soloSeats.platformAddress, platformAddress))
      .limit(1);
    if (existingAddr) {
      return apiConflict(
        `Platform address "${platformAddress}" is already allocated to another user`
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

    return apiSuccess({ seat });
  }

  // premium
  const [existing] = await db
    .select({ id: premiumSeats.id })
    .from(premiumSeats)
    .where(eq(premiumSeats.userId, userId))
    .limit(1);

  if (existing) {
    return apiConflict('User already has a premiumSeat');
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

  return apiSuccess({ seat });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id || !hasPermission(session.user.role as string, 'users')) {
    return apiForbidden();
  }

  const { tenantId } = await withTenant();
  const body = await request.json();
  const { userId, seatType, platformAddress } = body;

  if (!userId || !seatType) {
    return apiError('VALIDATION_ERROR', 'userId and seatType required', 400);
  }

  if (seatType === 'solo') {
    const conditions = [eq(soloSeats.userId, userId), eq(soloSeats.tenantId, tenantId)];
    if (platformAddress) conditions.push(eq(soloSeats.platformAddress, platformAddress));

    const seat = await db
      .select({ id: soloSeats.id })
      .from(soloSeats)
      .where(and(...conditions))
      .limit(1);

    if (!seat.length) {
      return apiNotFound('soloSeat not found');
    }

    await db.delete(soloSeats).where(eq(soloSeats.id, seat[0].id));
    return apiSuccess({ success: true });
  }

  if (seatType === 'premium') {
    const [seat] = await db
      .select({ id: premiumSeats.id })
      .from(premiumSeats)
      .where(and(eq(premiumSeats.userId, userId), eq(premiumSeats.tenantId, tenantId)))
      .limit(1);

    if (!seat) {
      return apiNotFound('premiumSeat not found');
    }

    await db.delete(premiumSeats).where(eq(premiumSeats.id, seat.id));
    return apiSuccess({ success: true });
  }

  return apiError('VALIDATION_ERROR', 'seatType must be solo or premium', 400);
}
