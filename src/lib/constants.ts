export const APP_NAME = 'Soralia Village';
export const APP_TAGLINE = 'A Community of Neighbors';

export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'af', 'xh', 'zu'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

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
export type Role = keyof typeof ROLES;

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

export const NAV_LINKS = [
  { href: '/', page: 'home' },
  { href: '/directory', page: 'directory' },
  { href: '/services', page: 'services' },
  { href: '/resources', page: 'resources' },
  { href: '/conservation', page: 'conservation' },
] as const;

export const INTEREST_CATEGORIES = [
  'gardening',
  'fitness',
  'book-club',
  'cooking',
  'photography',
  'volunteering',
  'conservation',
  'pets',
  'sports',
  'music',
  'arts',
] as const;

export const STREETS = [
  'Pagoda Rd',
  'Wild Almond Rd',
  'Silkypuff Street',
  'Beechwood Rd',
  'Sugarbrush Rd',
  'Conebrush Rd',
] as const;
