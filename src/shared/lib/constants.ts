/**
 * Application constants for Soralia Village Community Portal.
 * Centralized configuration for app metadata, map settings, roles, and UI constants.
 */

/** Application name */
export const APP_NAME = 'Soralia Village';
/** Application tagline */
export const APP_TAGLINE = 'A Community of Neighbors';

/** Default language code */
export const DEFAULT_LANGUAGE = 'en';

/** HTTP status codes */
export const HTTP = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** Cache time-to-live values in seconds */
export const CACHE_TTL = {
  SHORT: 30,
  DEFAULT: 300,
  LONG: 600,
  DAY: 86400,
  WEEK: 604800,
} as const;

/** Cookie names */
export const COOKIES = {
  SESSION: 'session',
  THEME: 'theme',
} as const;

/** File size limits in bytes */
export const FILE_SIZE = {
  AVATAR: 2 * 1024 * 1024,
  IMAGE: 5 * 1024 * 1024,
  DOCUMENT: 10 * 1024 * 1024,
} as const;
/** Supported language codes for i18n */
export const SUPPORTED_LANGUAGES = ['en', 'af', 'xh', 'zu'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Leaflet map center coordinates [lat, lng] */
export const MAP_CENTER: [number, number] = [-34.09165, 18.483269];
/** Leaflet map default zoom level */
export const MAP_ZOOM = 16;

/** Default pagination page size */
export const PAGINATION_DEFAULT_PAGE_SIZE = 20;

/** Content category types */
export const CONTENT_CATEGORIES = {
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  NEWS: 'NEWS',
  EVENT: 'EVENT',
  BLOG: 'BLOG',
  CONSERVATION: 'CONSERVATION',
  SERVICES: 'SERVICES',
  CAMPAIGN: 'CAMPAIGN',
} as const;

/** User role definitions */
export const ROLES = {
  RESIDENT: 'RESIDENT',
  GROUP_ADMIN: 'GROUP_ADMIN',
  COMMITTEE: 'COMMITTEE',
  BOARD: 'BOARD',
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',
  MANAGER: 'MANAGER',
  ASSOCIATE: 'ASSOCIATE',
  PROVIDER: 'PROVIDER',
} as const;
export type Role = keyof typeof ROLES;

/** Group member role types */
export const GROUP_ROLES = {
  MEMBER: 'MEMBER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
} as const;

/** Maintenance request priority levels */
export const MAINTENANCE_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  EMERGENCY: 'EMERGENCY',
} as const;

/** Maintenance request status values */
export const MAINTENANCE_STATUSES = {
  SUBMITTED: 'SUBMITTED',
  ASSIGNED: 'ASSIGNED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING_PARTS: 'PENDING_PARTS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

/** Facility booking status values */
export const BOOKING_STATUSES = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

/** Available interest categories for user profiles */
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

/** Display names for interest categories */
export const INTERESTS_DISPLAY: Record<string, string> = {
  gardening: 'Gardening',
  fitness: 'Fitness',
  'book-club': 'Book Club',
  cooking: 'Cooking',
  photography: 'Photography',
  volunteering: 'Volunteering',
  conservation: 'Conservation',
  pets: 'Pets',
  sports: 'Sports',
  music: 'Music',
  arts: 'Arts',
};

/** Tailwind CSS color classes for interest categories */
export const INTEREST_COLORS: Record<string, string> = {
  gardening: 'bg-green-500',
  conservation: 'bg-green-600',
  tennis: 'bg-blue-500',
  swimming: 'bg-blue-600',
  'book-club': 'bg-purple-500',
  fitness: 'bg-cyan-700',
  photography: 'bg-pink-500',
  yoga: 'bg-indigo-600',
  cooking: 'bg-orange-500',
  chess: 'bg-indigo-500',
  arts: 'bg-pink-500',
  music: 'bg-purple-500',
  volunteering: 'bg-orange-500',
  pets: 'bg-amber-500',
  sports: 'bg-blue-500',
  Gardening: 'bg-green-500',
  Conservation: 'bg-green-600',
  Tennis: 'bg-blue-500',
  Swimming: 'bg-blue-600',
  'Book Club': 'bg-purple-500',
  Fitness: 'bg-cyan-700',
  Photography: 'bg-pink-500',
  Yoga: 'bg-indigo-600',
  Cooking: 'bg-orange-500',
  Chess: 'bg-indigo-500',
  Arts: 'bg-pink-500',
  Music: 'bg-purple-500',
  Volunteering: 'bg-orange-500',
  Pets: 'bg-amber-500',
  Sports: 'bg-blue-500',
};

/** Available card header background colors */
export const CARD_HEADER_COLORS = [
  'bg-soralia-primary',
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
] as const;

/** Tailwind CSS animation classes for cards */
export const CARD_ANIMATIONS = {
  hover: 'hover:scale-[1.02] hover:shadow-xl',
  transition: 'transition-all duration-300 ease-in-out',
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  headerGradient: 'bg-gradient-to-br',
  transform: 'transform',
} as const;

/** Resident type classifications */
export const RESIDENT_TYPES = {
  OWNER: 'OWNER',
  RENTER: 'RENTER',
} as const;
export type ResidentType = keyof typeof RESIDENT_TYPES;

/** Streets in Soralia Village */
export const STREETS = [
  'Pagoda Rd',
  'Wild Almond Rd',
  'Silkypuff Street',
  'Beechwood Rd',
  'Sugarbrush Rd',
  'Conebrush Rd',
] as const;
