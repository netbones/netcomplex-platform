// Admin user management types — used by UsersListSection and related components

import type { StandardSeat, SoloSeat } from '@shared/lib';

/** @property-consolidation-plan (44-03 findings)
 * Admin user management lite view. Has `platformAddress?` as optional.
 * Do NOT consolidate with PropertySummaryDTO (which requires platformAddress).
 * Per C1 resolution: leave as-is unless nullability aligns.
 * Fields: id, street, unit, platformAddress? — all match Prisma field names.
 * Last audit: 2026-06-08
 */
/** Lightweight property info as returned by admin users API */
export interface PropertyInfo {
  id: string;
  street: string;
  unit: string;
  platformAddress?: string;
}

/** Premium seat attached to a user */
export interface PremiumSeat {
  id: string;
  platformAddress: string;
  portfolioName: string | null;
  tier: string | null;
  isActive: boolean | null;
}

/** User profile with occupancy/residency info */
export interface AdminUserProfile {
  occupantType: string;
  residencyType: string;
  property: PropertyInfo;
}

/** Full admin user record as returned by /api/users */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  isPublic: boolean;
  showEmail: boolean;
  showPhone: boolean;
  profileSlug: string | null;
  interests: string[];
  isPlatformAdmin?: boolean;
  standardSeats: StandardSeat[];
  soloSeats: SoloSeat[];
  premiumSeat: PremiumSeat | null;
  profiles: AdminUserProfile[];
}

/** Pending invitation record */
export interface Invitation {
  id: string;
  email: string;
  name: string;
  street: string | null;
  unit: string | null;
  residentType: string;
  status: string;
}

/** Resolved seat display info */
export interface SeatInfo {
  label: string;
  labelClass: string;
  address: string;
}

/** Form shape for inviting a new resident */
export interface InviteFormData {
  email: string;
  name: string;
  street: string;
  unit: string;
  residentType: string;
  role: string;
}

/** Form shape for allocating a seat */
export interface AllocateSeatFormData {
  platformAddress: string;
  soloSeatType: string;
  portfolioName: string;
}

export const roleOptions = ['RESIDENT', 'BOARD', 'ADMIN', 'COMMITTEE'] as const;

export const PAGE_SIZE = 20;

/** Suspension record as returned by the API */
export interface AdminSuspension {
  id: string;
  userId: string;
  suspensionType: string;
  reason: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isPermanent: boolean;
  isActive: boolean;
  createdById: string;
  createdAt: string;
}

/** Form data for creating a suspension */
export interface SuspensionFormData {
  suspensionType: string;
  reason: string;
  description?: string;
  duration: '2days' | '1week' | '30days' | 'permanent';
  endDate?: string;
}

export const suspensionTypes = [
  { value: 'VIOLATION', label: 'Code of Conduct Violation' },
  { value: 'DISRUPTION', label: 'Disruptive Behavior' },
  { value: 'BEHAVIOR', label: 'Inappropriate Behavior' },
  { value: 'PROPERTY', label: 'Property Damage' },
  { value: 'NON_PAYMENT', label: 'Non-Payment' },
  { value: 'OTHER', label: 'Other' },
] as const;
