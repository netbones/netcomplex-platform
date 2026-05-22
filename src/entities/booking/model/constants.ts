import type { BookingStatus, Facility, TenantFacility } from './types';

export const BOOKING_STATUSES: Record<BookingStatus, BookingStatus> = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

/**
 * Preset catalog of all possible facility options.
 * Used by the onboarding wizard and admin settings to let tenants pick their facilities.
 * Tenants select from these presets and can add custom facilities.
 */
export const PRESET_FACILITIES: TenantFacility[] = [
  { value: 'POOL', label: 'Swimming Pool' },
  { value: 'GYM', label: 'Gym/Fitness Center' },
  { value: 'COMMUNITY_CENTER', label: 'Community Center/Hall' },
  { value: 'TENNIS', label: 'Tennis Court' },
  { value: 'BBQ_AREA', label: 'BBQ Area' },
  { value: 'MEETING_ROOM', label: 'Meeting Room' },
  { value: 'GARDEN_PLOT', label: 'Garden Plot/Allotment' },
  { value: 'LAUNDRY', label: 'Laundry Room' },
  { value: 'PARKING', label: 'Parking Area' },
  { value: 'ROOFTOP', label: 'Rooftop Terrace' },
  { value: 'SPORTS_COURT', label: 'Sports Court' },
  { value: 'SAUNA', label: 'Sauna/Spa' },
  { value: 'PLAYGROUND', label: 'Playground' },
  { value: 'LIBRARY', label: 'Library/Reading Room' },
  { value: 'COWORKING', label: 'Co-working Space' },
];

/**
 * Default facilities for backward compatibility — the 5 original ones.
 * Used when a tenant has no custom facility configuration.
 */
export const DEFAULT_FACILITIES: TenantFacility[] = [
  { value: 'POOL', label: 'Swimming Pool' },
  { value: 'GYM', label: 'Gym' },
  { value: 'COMMUNITY_CENTER', label: 'Community Center' },
  { value: 'TENNIS', label: 'Tennis Court' },
  { value: 'BBQ_AREA', label: 'BBQ Area' },
];

/**
 * Legacy facility map — kept for backward compatibility.
 * Maps facility values to their display labels.
 * New code should use PRESET_FACILITIES or DEFAULT_FACILITIES instead.
 */
export const FACILITIES: Record<string, { label: string; value: string }> = {
  POOL: { label: 'Swimming Pool', value: 'POOL' },
  GYM: { label: 'Gym', value: 'GYM' },
  COMMUNITY_CENTER: { label: 'Community Center', value: 'COMMUNITY_CENTER' },
  TENNIS: { label: 'Tennis Court', value: 'TENNIS' },
  BBQ_AREA: { label: 'BBQ Area', value: 'BBQ_AREA' },
} as const;

/**
 * Legacy facility labels map — kept for backward compatibility.
 * Handles both uppercase and lowercase facility values.
 * New code should use PRESET_FACILITIES or DEFAULT_FACILITIES instead.
 */
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

/**
 * Legacy valid facility list — kept for backward compatibility.
 * New code should validate against tenant's configured facilities from settings.
 */
export const VALID_FACILITIES: string[] = ['POOL', 'GYM', 'COMMUNITY_CENTER', 'TENNIS', 'BBQ_AREA'];

export const BOOKING_STATUS_COLORS: Record<BookingStatus, { bg: string; text: string }> = {
  CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800' },
} as const;
