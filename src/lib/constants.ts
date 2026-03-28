export const APP_NAME = 'Soralia Village';
export const APP_TAGLINE = 'A Community of Neighbors';

export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'af', 'xh', 'zu'] as const;

export const MAP_CENTER: [number, number] = [-34.09165, 18.483269];
export const MAP_ZOOM = 16;

export const PAGINATION_DEFAULT_PAGE_SIZE = 20;

export const CONTENT_CATEGORIES = {
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  NEWS: 'NEWS',
  EVENT: 'EVENT',
  BLOG: 'BLOG',
} as const;

export const ROLES = {
  RESIDENT: 'RESIDENT',
  BOARD: 'BOARD',
  ADMIN: 'ADMIN',
} as const;

export const GROUP_ROLES = {
  MEMBER: 'MEMBER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
} as const;

export const MAINTENANCE_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  EMERGENCY: 'EMERGENCY',
} as const;

export const MAINTENANCE_STATUSES = {
  SUBMITTED: 'SUBMITTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const BOOKING_STATUSES = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;
