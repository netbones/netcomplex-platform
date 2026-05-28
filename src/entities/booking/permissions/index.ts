import { hasPermission } from '@entities/tenant/api/permissions';

/**
 * Checks if the role can view all bookings (as opposed to only their own).
 */
export function canViewAllBookings(role: string): boolean {
  return hasPermission(role, 'bookings');
}
