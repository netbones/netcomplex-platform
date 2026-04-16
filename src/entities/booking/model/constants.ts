import type { BookingStatus, Facility } from './types';

export const BOOKING_STATUSES: Record<BookingStatus, BookingStatus> = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

export const FACILITIES: Record<Facility, { label: string; value: Facility }> = {
  POOL: { label: 'Swimming Pool', value: 'POOL' },
  GYM: { label: 'Gym', value: 'GYM' },
  COMMUNITY_CENTER: { label: 'Community Center', value: 'COMMUNITY_CENTER' },
  TENNIS: { label: 'Tennis Court', value: 'TENNIS' },
  BBQ_AREA: { label: 'BBQ Area', value: 'BBQ_AREA' },
} as const;

export const FACILITY_LABELS: Record<string, string> = {
  POOL: 'Swimming Pool',
  GYM: 'Gym',
  COMMUNITY_CENTER: 'Community Center',
  TENNIS: 'Tennis Court',
  BBQ_AREA: 'BBQ Area',
  community_center: 'Community Center',
  swimming_pool: 'Swimming Pool',
  tennis_court: 'Tennis Court',
  bbq_area: 'BBQ Area',
  meeting_room: 'Meeting Room',
  garden_plot: 'Garden Plot',
} as const;

export const VALID_FACILITIES: Facility[] = [
  'POOL',
  'GYM',
  'COMMUNITY_CENTER',
  'TENNIS',
  'BBQ_AREA',
];

export const BOOKING_STATUS_COLORS: Record<BookingStatus, { bg: string; text: string }> = {
  CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800' },
} as const;
