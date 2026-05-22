export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

/**
 * Facility type is now tenant-configurable (string) instead of a fixed enum.
 * Tenants define their own facility list via onboarding or settings API.
 * Backward-compatible: existing facility values (POOL, GYM, etc.) still work.
 */
export type Facility = string;

/**
 * A tenant-configurable facility option with value/label pairs.
 */
export interface TenantFacility {
  value: string;
  label: string;
}

export interface Booking {
  id: string;
  userId: string;
  facility: Facility;
  date: string | Date;
  startTime: string;
  endTime: string;
  purpose: string | null;
  status: BookingStatus;
  createdAt: string | Date;
  updatedAt: string | Date | null;
  user?: {
    id: string;
    name: string;
    unit: string | null;
  };
}

export interface BookingFormData {
  facility: Facility;
  date: string;
  startTime: string;
  endTime: string;
  purpose?: string;
}

export interface BookingListItem {
  id: string;
  facility: Facility;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string | null;
  status: BookingStatus;
  user?: {
    id: string;
    name: string;
  };
}

export interface BookingCreateInput {
  facility: Facility;
  date: string;
  startTime: string;
  endTime: string;
  purpose?: string;
  userId?: string;
}
