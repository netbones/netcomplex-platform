// Amenity types

export type AmenityStatus = 
  | 'always_open'
  | 'open'
  | 'closes_soon'
  | 'closed'
  | 'fully_booked'
  | 'booked_today';

export interface AmenityHours {
  open: string | null;   // "06:00" or null for always open
  close: string | null;  // "21:30" or null
}

export interface Amenity {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  icon: string;
  photoUrl: string | null;
  hoursOpen: string | null;
  hoursClose: string | null;
  bookable: boolean;
  contactEnabled: boolean;
  contactPhone: string | null;
  maxOccupancy: number | null;
  slotDurationMins: number | null;
  rulesText: string | null;
  waitlistEnabled: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AmenityWithStatus extends Amenity {
  computedStatus: AmenityStatus;
  statusText: string;
}

export interface TimeSlot {
  time: string;        // "09:00"
  available: boolean;
  booked: boolean;
}

export interface BookingWindow {
  startDate: Date;
  endDate: Date;
  daysAhead: number;   // How many days ahead can be booked
}
