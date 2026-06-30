import {
  db,
  users,
  soloSeats,
  premiumSeats,
  apiSuccess,
  apiConflict,
  apiForbidden,
  apiNotFound,
  apiError,
  auth,
  withErrorHandler,
  AddressService,
  AddressConflictError,
  AddressValidationError,
} from '@api/server';

import { count, eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { hasPermission } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

export const POST = withErrorHandler(async (request: Request) => {
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
    const [{ count: soloCount }] = await db
      .select({ count: count() })
      .from(soloSeats)
      .where(eq(soloSeats.userId, userId));
    if (soloCount >= 5) {
      return apiConflict('User already has 5 soloSeats (maximum)');
    }

    // Reserve address via AddressService + insert + backfill in a single transaction
    let seat;
    try {
      seat = await db.transaction(async tx => {
        const addressService = new AddressService(tx);
        const addressRecord = await addressService.reserve(platformAddress, tenantId, 'SOLO', {
          ownerType: 'SOLO_SEAT',
        });

        const [newSeat] = await tx
          .insert(soloSeats)
          .values({
            id: createId(),
            userId,
            tenantId,
            platformAddress,
            seatType: soloSeatType || 'RESIDENT',
            isComplimentary: true,
          })
          .returning();

        await tx
          .update(soloSeats)
          .set({ addressId: addressRecord.id as string })
          .where(eq(soloSeats.id, newSeat.id));

        return newSeat;
      });
    } catch (e) {
      if (e instanceof AddressConflictError) return apiConflict(e.message);
      if (e instanceof AddressValidationError) return apiError('VALIDATION_ERROR', e.message, 400);
      throw e;
    }

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

  // Reserve address via AddressService + insert + backfill in a single transaction
  let seat;
  try {
    seat = await db.transaction(async tx => {
      const addressService = new AddressService(tx);
      const addressRecord = await addressService.reserve(platformAddress, tenantId, 'PREMIUM', {
        ownerType: 'PREMIUM_SEAT',
      });

      const [newSeat] = await tx
        .insert(premiumSeats)
        .values({
          id: createId(),
          userId,
          tenantId,
          platformAddress,
          portfolioName: portfolioName || null,
          subscriptionTier: 'basic',
          maxProperties: 5,
          messageRetentionDays: 30,
          tier: 'foundation',
        })
        .returning();

      await tx
        .update(premiumSeats)
        .set({ addressId: addressRecord.id as string })
        .where(eq(premiumSeats.id, newSeat.id));

      return newSeat;
    });
  } catch (e) {
    if (e instanceof AddressConflictError) return apiConflict(e.message);
    if (e instanceof AddressValidationError) return apiError('VALIDATION_ERROR', e.message, 400);
    throw e;
  }

  return apiSuccess({ seat });
});

export const DELETE = withErrorHandler(async (request: Request) => {
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
});
