import { db, vehicles, notDeleted, now } from '@api/server';
import { and, eq, isNull } from 'drizzle-orm';
import { profiles, standardSeats, propertyJoinRequests } from '@api/server';

/**
 * Vehicle lifecycle helpers for ADVISORY-038 Phase 4.
 *
 * Vehicles are staged against a PropertyJoinRequest during the public wizard
 * and re-parented to a Profile or StandardSeat once that request becomes a
 * real membership. Rejection/withdrawal soft-deletes the staged rows.
 */

export interface VehicleRow {
  id: string;
  tenantId: string;
  joinRequestId: string | null;
  profileId: string | null;
  standardSeatId: string | null;
  make: string | null;
  model: string | null;
  color: string | null;
  registration: string;
  createdAt: Date;
  deletedAt: Date | null;
}

/**
 * Soft-delete every vehicle still staged against a join request.
 * Used on rejection and withdrawal.
 */
export async function softDeleteVehiclesForJoinRequest(
  joinRequestId: string,
  tenantId: string
): Promise<void> {
  await db
    .update(vehicles)
    .set({ deletedAt: now() })
    .where(
      and(
        eq(vehicles.joinRequestId, joinRequestId),
        eq(vehicles.tenantId, tenantId),
        notDeleted(vehicles)
      )
    );
}

/**
 * Re-parent active staged vehicles from a join request to a Profile.
 * Call only after the acceptance flow has produced a Profile (G5: the
 * provisioning boundary is explicit — acceptance does not create it).
 */
export async function reparentVehiclesToProfile(
  joinRequestId: string,
  profileId: string,
  tenantId: string
): Promise<void> {
  await db
    .update(vehicles)
    .set({ profileId, joinRequestId: null })
    .where(
      and(
        eq(vehicles.joinRequestId, joinRequestId),
        eq(vehicles.tenantId, tenantId),
        notDeleted(vehicles)
      )
    );
}

/**
 * Re-parent active staged vehicles from a join request to a StandardSeat.
 * Used for OWNER_RESIDENT / OWNER_LEASING outcomes.
 */
export async function reparentVehiclesToSeat(
  joinRequestId: string,
  standardSeatId: string,
  tenantId: string
): Promise<void> {
  await db
    .update(vehicles)
    .set({ standardSeatId, joinRequestId: null })
    .where(
      and(
        eq(vehicles.joinRequestId, joinRequestId),
        eq(vehicles.tenantId, tenantId),
        notDeleted(vehicles)
      )
    );
}

/**
 * List active staged vehicles for a join request (for admin display and tests).
 */
export async function listStagedVehicles(
  joinRequestId: string,
  tenantId: string
): Promise<VehicleRow[]> {
  return db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.joinRequestId, joinRequestId),
        eq(vehicles.tenantId, tenantId),
        isNull(vehicles.deletedAt)
      )
    );
}

/**
 * Re-parent vehicles for an accepted invitation.
 *
 * G5 boundary: this does NOT provision a Profile/StandardSeat. It only moves
 * staged vehicles when the acceptance flow (or a separate provisioning flow)
 * has already produced one for the user. If none exists yet, vehicles stay
 * staged against the join request and can be re-parented when provisioning
 * eventually runs.
 */
export async function reparentVehiclesForAcceptedInvitation(
  invitationId: string,
  userId: string,
  tenantId: string
): Promise<void> {
  const [joinRequest] = await db
    .select({ id: propertyJoinRequests.id })
    .from(propertyJoinRequests)
    .where(
      and(
        eq(propertyJoinRequests.resultingInvitationId, invitationId),
        eq(propertyJoinRequests.tenantId, tenantId),
        isNull(propertyJoinRequests.deletedAt)
      )
    )
    .limit(1);

  if (!joinRequest) return;

  const [profile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(eq(profiles.userId, userId), eq(profiles.tenantId, tenantId), isNull(profiles.deletedAt))
    )
    .limit(1);

  if (profile) {
    await db
      .update(vehicles)
      .set({ profileId: profile.id, joinRequestId: null })
      .where(
        and(
          eq(vehicles.joinRequestId, joinRequest.id),
          eq(vehicles.tenantId, tenantId),
          notDeleted(vehicles)
        )
      );
    return;
  }

  const [seat] = await db
    .select({ id: standardSeats.id })
    .from(standardSeats)
    .where(
      and(
        eq(standardSeats.userId, userId),
        eq(standardSeats.tenantId, tenantId),
        isNull(standardSeats.archivedAt)
      )
    )
    .limit(1);

  if (seat) {
    await db
      .update(vehicles)
      .set({ standardSeatId: seat.id, joinRequestId: null })
      .where(
        and(
          eq(vehicles.joinRequestId, joinRequest.id),
          eq(vehicles.tenantId, tenantId),
          notDeleted(vehicles)
        )
      );
  }
}
