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
  GROUP_ADMIN: 'GROUP_ADMIN',
  COMMITTEE: 'COMMITTEE',
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
  { href: '/groups', page: 'groups' },
  { href: '/interest', page: 'interest' },
] as const;

export const PUBLIC_NAV_LINKS = [
  { href: '/', page: 'home' },
  { href: '/conservation', page: 'conservation' },
] as const;

export const ADMIN_LINKS = [
  { href: '/admin/users', page: 'Users' },
  { href: '/admin/content', page: 'Content' },
  { href: '/admin/groups', page: 'Groups' },
  { href: '/admin/requests', page: 'Requests' },
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

export const CARD_HEADER_COLORS = [
  'bg-soralia-primary',
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
] as const;

export const CARD_ANIMATIONS = {
  hover: 'hover:scale-[1.02] hover:shadow-xl',
  transition: 'transition-all duration-300 ease-in-out',
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  headerGradient: 'bg-gradient-to-br',
  transform: 'transform',
} as const;

export const RESIDENT_TYPES = {
  OWNER: 'OWNER',
  RENTER: 'RENTER',
} as const;
export type ResidentType = keyof typeof RESIDENT_TYPES;

export const STREETS = [
  'Pagoda Rd',
  'Wild Almond Rd',
  'Silkypuff Street',
  'Beechwood Rd',
  'Sugarbrush Rd',
  'Conebrush Rd',
] as const;
