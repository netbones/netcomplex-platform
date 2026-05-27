import type { AdminUser, SeatInfo } from '@entities/user/model/types';

/** Derive a display address from a user's seat/profile chain */
export function resolveAddress(u: AdminUser): string {
  const seat = u.standardSeats?.[0];
  if (seat?.property?.street) {
    const p = seat.property;
    return p.unit ? `${p.street} ${p.unit}` : p.street;
  }
  if (u.soloSeats?.[0]?.property?.street) {
    const p = u.soloSeats[0].property;
    return p.unit ? `${p.street} ${p.unit}` : p.street;
  }
  const profile = u.profiles?.[0];
  if (profile?.property?.street) {
    const p = profile.property;
    return p.unit ? `${p.street} ${p.unit}` : p.street;
  }
  return '';
}

/** Derive occupant type label (Owner, Renter, Resident, Board) */
export function resolveType(u: AdminUser): string {
  const profileOccupant = u.profiles?.[0]?.occupantType;
  if (profileOccupant === 'OWNER') return 'Owner';
  if (profileOccupant === 'RENTER') return 'Renter';
  if (u.standardSeats?.length && u.standardSeats[0]?.isPrimaryOwner) return 'Owner';
  if (u.standardSeats?.length) return 'Resident';
  if (u.soloSeats?.length) return 'Board';
  if (u.profiles?.length) return 'Resident';
  return '';
}

/** Resolve seat badge info (label, color class, platform address) */
export function resolveSeatInfo(u: AdminUser): SeatInfo {
  if (u.premiumSeat) {
    return {
      label: 'Premium',
      labelClass: 'bg-purple-100 text-purple-800',
      address: u.premiumSeat.platformAddress,
    };
  }
  if (u.soloSeats?.[0]) {
    return {
      label: `Vanity (${u.soloSeats.length})`,
      labelClass: 'bg-amber-100 text-amber-800',
      address: u.soloSeats[0].platformAddress,
    };
  }
  if (u.standardSeats?.length && u.standardSeats[0]?.platformAddress) {
    return {
      label: 'Standard',
      labelClass: 'bg-blue-100 text-blue-800',
      address: u.standardSeats[0].platformAddress,
    };
  }
  const pAddr = u.profiles?.[0]?.property?.platformAddress;
  if (pAddr) return { label: '', labelClass: '', address: pAddr };
  return { label: '', labelClass: '', address: '' };
}
