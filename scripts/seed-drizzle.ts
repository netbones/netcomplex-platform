/**
 * Seed script for Soralia Village.
 *
 * Imports from @schema/* (src/db/schema/) for database schema definitions.
 *
 * Run: pnpm db:seed
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { users } from '@schema/users';
import { properties } from '@schema/properties';
import { households } from '@schema/households';
import { profiles } from '@schema/profiles';
import { standardSeats } from '@schema/standard-seats';
import { tenants } from '@schema/tenants';
import { communityServiceListings } from '@schema/community-service-listings';
import { communityServiceReviews } from '@schema/community-service-reviews';
import { groups } from '@schema/groups';
import { userGroups } from '@schema/user-groups';
import { resources } from '@schema/resources';
import { contents } from '@schema/contents';
import { events } from '@schema/events';
import { surveys } from '@schema/surveys';
import { questions } from '@schema/questions';
import { responses } from '@schema/responses';
import { competitions } from '@schema/competitions';
import { maintenanceCategories } from '@schema/maintenance-categories';
import { maintenanceTeams } from '@schema/maintenance-teams';
import { serviceProviders } from '@schema/service-providers';
import { maintenanceRequests } from '@schema/maintenance-requests';
import { settings } from '@schema/settings';

const connectionString = (process.env.DATABASE_URL ?? '').replace(
  'sslmode=require',
  'sslmode=no-verify'
);

const pool = new Pool({ connectionString, connectionTimeoutMillis: 15000 });
const db = drizzle(pool);

// Placeholder — overridden in seed() with actual tenant UUID
const TENANT_ID = 'soralia';
const now = new Date();

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TENANT = {
  name: 'Soralia Village',
  slug: 'soralia',
  primaryColor: '#4F46E5',
  subscriptionTier: 'forest',
  tier: 'STANDARD' as const,
  featureFlags: {},
  maxPages: 10,
  pageCount: 0,
  active: true,
};

const USERS = [
  {
    id: 'user-john-smith',
    email: 'john.smith@soralia.org',
    name: 'John Smith',
    role: 'RESIDENT' as const,
    phone: '+27 82 123 4567',
    interests: ['gardening', 'tennis'],
    books: [
      {
        id: 'book-1',
        title: "The Gardener's Guide to South African Plants",
        author: 'Patricia Anne',
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      },
      {
        id: 'book-2',
        title: 'Fynbos: A Field Guide',
        author: 'Gideon Smith',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      },
      {
        id: 'book-3',
        title: 'Water-Wise Gardening in South Africa',
        author: 'Noelle Johnson',
        coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
      },
    ],
  },
  {
    id: 'user-sarah-mitchell',
    email: 'sarah.mitchell@soralia.org',
    name: 'Sarah Mitchell',
    role: 'BOARD' as const,
    phone: '+27 82 234 5678',
    interests: ['gardening', 'book-club'],
    books: [
      {
        id: 'book-4',
        title: 'The Promise',
        author: 'Damon Galgut',
        coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400',
      },
      {
        id: 'book-5',
        title: 'Born a Crime',
        author: 'Trevor Noah',
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      },
      {
        id: 'book-6',
        title: 'Community Governance Handbook',
        author: 'HOA Press',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      },
      {
        id: 'book-7',
        title: 'The Four Winds',
        author: 'Kristin Hannah',
        coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
      },
    ],
  },
  {
    id: 'user-michael-chen',
    email: 'michael.chen@soralia.org',
    name: 'Michael Chen',
    role: 'RESIDENT' as const,
    phone: '+27 82 345 6789',
    interests: ['fitness', 'photography'],
    books: [
      {
        id: 'book-8',
        title: 'Understanding Exposure',
        author: 'Bryan Peterson',
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      },
      {
        id: 'book-9',
        title: "The Photographer's Eye",
        author: 'Michael Freeman',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      },
    ],
  },
  {
    id: 'user-emma-williams',
    email: 'emma.williams@soralia.org',
    name: 'Emma Williams',
    role: 'RESIDENT' as const,
    phone: '+27 82 456 7890',
    interests: ['book-club', 'cooking'],
    books: [
      {
        id: 'book-10',
        title: 'The Joy of Cooking',
        author: 'Irma Rombauer',
        coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
      },
      {
        id: 'book-11',
        title: 'Circe',
        author: 'Madeline Miller',
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      },
      {
        id: 'book-12',
        title: 'Where the Crawdads Sing',
        author: 'Delia Owens',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      },
      {
        id: 'book-13',
        title: 'Cape Malay Cooking',
        author: 'Fatima Sydow',
        coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
      },
      {
        id: 'book-14',
        title: 'The Midnight Library',
        author: 'Matt Haig',
        coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400',
      },
    ],
  },
  {
    id: 'user-david-vdm',
    email: 'david.van.der.merwe@soralia.org',
    name: 'David van der Merwe',
    role: 'ADMIN' as const,
    phone: '+27 82 567 8901',
    interests: ['volunteering', 'conservation'],
    books: [
      {
        id: 'book-15',
        title: 'Silent Spring',
        author: 'Rachel Carson',
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      },
      {
        id: 'book-16',
        title: 'The Hidden Life of Trees',
        author: 'Peter Wohlleben',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      },
      {
        id: 'book-17',
        title: 'Fynbos of the Cape Peninsula',
        author: 'Richard Cowling',
        coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
      },
    ],
  },
  {
    id: 'user-lisa-chen',
    email: 'lisa.chen@soralia.org',
    name: 'Lisa Chen',
    role: 'RESIDENT' as const,
    phone: '+27 82 678 9012',
    interests: ['yoga', 'photography'],
    books: [
      {
        id: 'book-18',
        title: 'Light on Yoga',
        author: 'B.K.S. Iyengar',
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      },
      {
        id: 'book-19',
        title: 'The Yoga Bible',
        author: 'Christina Brown',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      },
    ],
  },
  {
    id: 'user-robert-wilson',
    email: 'robert.wilson@soralia.org',
    name: 'Robert Wilson',
    role: 'COMMITTEE' as const,
    phone: '+27 82 789 0123',
    interests: ['governance', 'finance', 'community'],
    books: [
      {
        id: 'book-20',
        title: 'Sectional Titles Schemes Management Act',
        author: 'LexisNexis',
        coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400',
      },
      {
        id: 'book-21',
        title: 'Financial Management for HOAs',
        author: 'Community Living Press',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      },
    ],
  },
  {
    id: 'user-anna-patel',
    email: 'anna.patel@soralia.org',
    name: 'Anna Patel',
    role: 'RESIDENT' as const,
    phone: '+27 82 890 1234',
    interests: ['cooking', 'gardening', 'book-club'],
    books: [
      {
        id: 'book-22',
        title: 'Indian Vegetarian Cooking',
        author: 'Madhur Jaffrey',
        coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
      },
      {
        id: 'book-23',
        title: 'The Alchemist',
        author: 'Paulo Coelho',
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      },
    ],
  },
  {
    id: 'user-marcus-johnson',
    email: 'marcus.johnson@soralia.org',
    name: 'Marcus Johnson',
    role: 'RESIDENT' as const,
    phone: '+27 82 901 2345',
    interests: ['fitness', 'music', 'volunteering'],
    books: [
      {
        id: 'book-24',
        title: 'Becoming',
        author: 'Michelle Obama',
        coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400',
      },
      {
        id: 'book-25',
        title: 'The Art of Resilience',
        author: 'Ross Edgley',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      },
    ],
  },
  {
    id: 'user-priya-naidoo',
    email: 'priya.naidoo@soralia.org',
    name: 'Priya Naidoo',
    role: 'RESIDENT' as const,
    phone: '+27 82 012 3456',
    interests: ['yoga', 'cooking'],
    books: [
      {
        id: 'book-26',
        title: 'Yoga Anatomy',
        author: 'Leslie Kaminoff',
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      },
      {
        id: 'book-27',
        title: 'The Flavor Equation',
        author: 'Nik Sharma',
        coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
      },
      {
        id: 'book-28',
        title: 'Eat, Pray, Love',
        author: 'Elizabeth Gilbert',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      },
    ],
  },
  {
    id: 'user-james-okonkwo',
    email: 'james.okonkwo@soralia.org',
    name: 'James Okonkwo',
    role: 'RESIDENT' as const,
    phone: '+27 82 111 2222',
    interests: ['football', 'community'],
    books: [
      {
        id: 'book-29',
        title: 'Shoe Dog',
        author: 'Phil Knight',
        coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400',
      },
    ],
  },
  {
    id: 'user-fatima-hassan',
    email: 'fatima.hassan@soralia.org',
    name: 'Fatima Hassan',
    role: 'RESIDENT' as const,
    phone: '+27 82 333 4444',
    interests: ['art', 'gardening'],
    books: [
      {
        id: 'book-30',
        title: 'The Color of Water',
        author: 'James McBride',
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
      },
      {
        id: 'book-31',
        title: 'Botany for Gardeners',
        author: 'Brian Capon',
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      },
      {
        id: 'book-32',
        title: 'The Secret Garden',
        author: 'Frances Hodgson Burnett',
        coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
      },
    ],
  },
  // Service provider users
  {
    id: 'user-mike-johnson',
    email: 'gardener.mike@soralia.org',
    name: 'Mike Johnson',
    role: 'RESIDENT' as const,
    phone: '+27 82 345 6789',
    interests: ['gardening', 'landscaping'],
  },
  {
    id: 'user-susan-vdm',
    email: 'plumber.susan@soralia.org',
    name: 'Susan van der Merwe',
    role: 'RESIDENT' as const,
    phone: '+27 82 456 7890',
    interests: ['home-improvement', 'diy'],
  },
  {
    id: 'user-peter-nkosi',
    email: 'electrician.peter@soralia.org',
    name: 'Peter Nkosi',
    role: 'RESIDENT' as const,
    phone: '+27 82 567 8901',
    interests: ['electronics', 'home-improvement'],
  },
  {
    id: 'user-linda-fourie',
    email: 'cleaner.linda@soralia.org',
    name: 'Linda Fourie',
    role: 'RESIDENT' as const,
    phone: '+27 82 678 9012',
    interests: ['cleaning', 'organization'],
  },
  {
    id: 'user-hoa-services',
    email: 'hoa.services@soralia.org',
    name: 'Soralia HOA Services',
    role: 'ADMIN' as const,
    phone: '+27 21 123 4567',
    interests: ['community', 'maintenance'],
  },
  {
    id: 'user-cape-plumbing',
    email: 'trusted.plumbing@soralia.org',
    name: 'Cape Plumbing Solutions',
    role: 'AGENT' as const,
    phone: '+27 21 987 6543',
    interests: ['plumbing', 'emergency-services'],
  },
].map(u => ({
  ...u,
  tenantId: TENANT_ID,
  isPublic: true,
  isActive: true,
  emailVerified: true,
  createdAt: now,
  updatedAt: now,
}));

const PROPERTIES = [
  {
    id: 'prop-001',
    platformAddress: 'unit012@soralia.org',
    street: 'Pagoda Rd',
    unit: '12',
    ownerId: 'user-john-smith',
    homeImage: '/assets/images/home1.jpg',
  },
  {
    id: 'prop-002',
    platformAddress: 'unit008@soralia.org',
    street: 'Wild Almond Rd',
    unit: '8',
    ownerId: 'user-sarah-mitchell',
    homeImage: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
  },
  {
    id: 'prop-003',
    platformAddress: 'unit003@soralia.org',
    street: 'Silkypuff St',
    unit: '3',
    ownerId: 'user-michael-chen',
    homeImage: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
  },
  {
    id: 'prop-004',
    platformAddress: 'unit005@soralia.org',
    street: 'Conebrush Rd',
    unit: '5',
    ownerId: 'user-robert-wilson',
    homeImage: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
  },
  {
    id: 'prop-005',
    platformAddress: 'unit017@soralia.org',
    street: 'Beechwood',
    unit: '17',
    ownerId: 'user-anna-patel',
    homeImage: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800&q=80',
  },
  {
    id: 'prop-006',
    platformAddress: 'unit022@soralia.org',
    street: 'Sugarbrush',
    unit: '22',
    ownerId: 'user-marcus-johnson',
    homeImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  },
].map(p => ({ ...p, tenantId: TENANT_ID, createdAt: now, updatedAt: now }));

const HOUSEHOLDS = [
  {
    id: 'hh-001',
    propertyId: 'prop-001',
    occupancyType: 'OWNER_OCCUPIED' as const,
    moveInDate: new Date('2023-01-15'),
  },
  {
    id: 'hh-002',
    propertyId: 'prop-002',
    occupancyType: 'OWNER_OCCUPIED' as const,
    moveInDate: new Date('2022-08-20'),
  },
  {
    id: 'hh-003',
    propertyId: 'prop-003',
    occupancyType: 'OWNER_OCCUPIED' as const,
    moveInDate: new Date('2024-03-10'),
  },
  {
    id: 'hh-004',
    propertyId: 'prop-004',
    occupancyType: 'RENTAL' as const,
    moveInDate: new Date('2025-06-01'),
  },
  {
    id: 'hh-005',
    propertyId: 'prop-005',
    occupancyType: 'OWNER_OCCUPIED' as const,
    moveInDate: new Date('2023-09-01'),
  },
  {
    id: 'hh-006',
    propertyId: 'prop-006',
    occupancyType: 'OWNER_OCCUPIED' as const,
    moveInDate: new Date('2024-01-20'),
  },
].map(h => ({
  ...h,
  tenantId: TENANT_ID,
  status: 'ACTIVE' as const,
  createdAt: now,
  updatedAt: now,
}));

// OccupantType: OCCUPANT | MINOR | FAMILY
// ResidencyType: FAMILY | RENTER | OWNER_RESIDENT
const PROFILES = [
  {
    id: 'prof-john',
    householdId: 'hh-001',
    userId: 'user-john-smith',
    displayName: 'John Smith',
    profileAddress: 'john.unit012@soralia.org',
    occupantType: 'OCCUPANT' as const,
    residencyType: 'OWNER_RESIDENT' as const,
    occupantSince: new Date('2023-01-15'),
  },
  {
    id: 'prof-emma',
    householdId: 'hh-001',
    userId: 'user-emma-williams',
    displayName: 'Emma Williams',
    profileAddress: 'emma.unit012@soralia.org',
    occupantType: 'FAMILY' as const,
    residencyType: 'FAMILY' as const,
    occupantSince: new Date('2023-01-15'),
  },
  {
    id: 'prof-sarah',
    householdId: 'hh-002',
    userId: 'user-sarah-mitchell',
    displayName: 'Sarah Mitchell',
    profileAddress: 'sarah.unit008@soralia.org',
    occupantType: 'OCCUPANT' as const,
    residencyType: 'OWNER_RESIDENT' as const,
    occupantSince: new Date('2022-08-20'),
  },
  {
    id: 'prof-michael',
    householdId: 'hh-003',
    userId: 'user-michael-chen',
    displayName: 'Michael Chen',
    profileAddress: 'michael.unit003@soralia.org',
    occupantType: 'OCCUPANT' as const,
    residencyType: 'OWNER_RESIDENT' as const,
    occupantSince: new Date('2024-03-10'),
  },
  {
    id: 'prof-lisa',
    householdId: 'hh-003',
    userId: 'user-lisa-chen',
    displayName: 'Lisa Chen',
    profileAddress: 'lisa.unit003@soralia.org',
    occupantType: 'FAMILY' as const,
    residencyType: 'FAMILY' as const,
    occupantSince: new Date('2024-03-10'),
  },
  {
    id: 'prof-anna',
    householdId: 'hh-004',
    userId: 'user-anna-patel',
    displayName: 'Anna Patel',
    profileAddress: 'anna.unit005@soralia.org',
    occupantType: 'OCCUPANT' as const,
    residencyType: 'RENTER' as const,
    occupantSince: new Date('2025-06-01'),
  },
  {
    id: 'prof-priya',
    householdId: 'hh-005',
    userId: 'user-priya-naidoo',
    displayName: 'Priya Naidoo',
    profileAddress: 'priya.unit017@soralia.org',
    occupantType: 'OCCUPANT' as const,
    residencyType: 'OWNER_RESIDENT' as const,
    occupantSince: new Date('2023-09-01'),
  },
  {
    id: 'prof-marcus',
    householdId: 'hh-006',
    userId: 'user-marcus-johnson',
    displayName: 'Marcus Johnson',
    profileAddress: 'marcus.unit022@soralia.org',
    occupantType: 'OCCUPANT' as const,
    residencyType: 'OWNER_RESIDENT' as const,
    occupantSince: new Date('2024-01-20'),
  },
  {
    id: 'prof-james',
    householdId: 'hh-006',
    userId: 'user-james-okonkwo',
    displayName: 'James Okonkwo',
    profileAddress: 'james.unit022@soralia.org',
    occupantType: 'FAMILY' as const,
    residencyType: 'FAMILY' as const,
    occupantSince: new Date('2024-01-20'),
  },
  {
    id: 'prof-fatima',
    householdId: 'hh-005',
    userId: 'user-fatima-hassan',
    displayName: 'Fatima Hassan',
    profileAddress: 'fatima.unit017@soralia.org',
    occupantType: 'FAMILY' as const,
    residencyType: 'FAMILY' as const,
    occupantSince: new Date('2023-09-01'),
  },
].map(p => ({
  ...p,
  tenantId: TENANT_ID,
  isPublic: true,
  showEmail: true,
  showPhone: true,
  status: 'ACTIVE' as const,
  createdAt: now,
  updatedAt: now,
}));

const STANDARD_SEATS = [
  {
    id: 'seat-john',
    userId: 'user-john-smith',
    propertyId: 'prop-001',
    isPrimaryOwner: true,
    platformAddress: 'john.unit012@soralia.org',
  },
  {
    id: 'seat-sarah',
    userId: 'user-sarah-mitchell',
    propertyId: 'prop-002',
    isPrimaryOwner: true,
    platformAddress: 'sarah.unit008@soralia.org',
  },
  {
    id: 'seat-michael',
    userId: 'user-michael-chen',
    propertyId: 'prop-003',
    isPrimaryOwner: true,
    platformAddress: 'michael.unit003@soralia.org',
  },
  {
    id: 'seat-robert',
    userId: 'user-robert-wilson',
    propertyId: 'prop-004',
    isPrimaryOwner: true,
    platformAddress: 'robert.unit005@soralia.org',
  },
  {
    id: 'seat-anna',
    userId: 'user-anna-patel',
    propertyId: 'prop-004',
    isPrimaryOwner: false,
    platformAddress: 'anna.unit005@soralia.org',
  },
  {
    id: 'seat-priya',
    userId: 'user-priya-naidoo',
    propertyId: 'prop-005',
    isPrimaryOwner: true,
    platformAddress: 'priya.unit017@soralia.org',
  },
  {
    id: 'seat-marcus',
    userId: 'user-marcus-johnson',
    propertyId: 'prop-006',
    isPrimaryOwner: true,
    platformAddress: 'marcus.unit022@soralia.org',
  },
].map(s => ({ ...s, tenantId: TENANT_ID, createdAt: now, updatedAt: now }));

const SERVICE_LISTINGS = [
  {
    id: 'svc-gardening',
    providerId: 'user-mike-johnson',
    title: 'Garden Maintenance & Landscaping',
    description:
      'Professional garden maintenance including lawn mowing, trimming, weeding, and seasonal planting. 15 years experience in Cape Town gardens. References available.',
    category: 'GARDENING' as const,
    priceType: 'HOURLY' as const,
    price: '180',
    serviceAreas: ['Soralia Village', 'Muizenberg', 'St James'],
    availability: { weekdays: true, weekends: true, evenings: false },
    images: [
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400',
    ],
    portfolio: [],
    contactMethods: ['phone', 'email'],
    verified: true,
    rating: 4.8,
    reviewCount: 12,
    status: 'ACTIVE' as const,
    isPublished: true,
    termsAndConditions:
      'Payment due within 7 days. Materials extra. 24hr cancellation notice required.',
    cancellationPolicy:
      'Free cancellation up to 24 hours before service. 50% charge for same-day cancellation.',
  },
  {
    id: 'svc-plumbing',
    providerId: 'user-cape-plumbing',
    title: 'Emergency & Residential Plumbing',
    description:
      'Licensed plumbing services for all residential needs. 24/7 emergency callouts available. Fully insured with 5-year workmanship guarantee.',
    category: 'PLUMBING' as const,
    priceType: 'HOURLY' as const,
    price: '350',
    serviceAreas: ['Soralia Village', 'Muizenberg', 'Cape Town Southern Suburbs'],
    availability: { emergency: true, weekdays: true, weekends: true, evenings: true },
    licenseNumber: 'PL-2023-0456',
    insuranceExpiry: new Date('2027-12-31'),
    images: [
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    ],
    portfolio: [],
    contactMethods: ['phone', 'email'],
    verified: true,
    rating: 4.9,
    reviewCount: 28,
    status: 'ACTIVE' as const,
    isPublished: true,
    termsAndConditions:
      'Quote provided before work begins. Materials charged at cost plus 15%. All work guaranteed.',
    cancellationPolicy:
      'Emergency calls: 2hr cancellation notice. Scheduled work: 24hr notice required.',
  },
  {
    id: 'svc-electrical',
    providerId: 'user-peter-nkosi',
    title: 'Residential Electrical Repairs',
    description:
      'Qualified electrician specializing in residential electrical work. COC certificates available. Safe, reliable service with competitive rates.',
    category: 'ELECTRICAL' as const,
    priceType: 'HOURLY' as const,
    price: '280',
    serviceAreas: ['Soralia Village', 'Muizenberg'],
    availability: { weekdays: true, weekends: false, evenings: false },
    licenseNumber: 'ELE-2022-0789',
    insuranceExpiry: new Date('2026-08-15'),
    images: [
      'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400',
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
    ],
    portfolio: [],
    contactMethods: ['phone', 'email'],
    verified: true,
    rating: 4.7,
    reviewCount: 8,
    status: 'ACTIVE' as const,
    isPublished: true,
    termsAndConditions:
      'All work complies with SANS 10142. COC certificates provided. 6-month workmanship guarantee.',
    cancellationPolicy:
      '24hr notice required for cancellation. Emergency work cannot be cancelled.',
  },
  {
    id: 'svc-cleaning',
    providerId: 'user-linda-fourie',
    title: 'Deep Cleaning & Housekeeping',
    description:
      'Thorough cleaning services for homes and apartments. Eco-friendly products used. Regular and one-time cleans available.',
    category: 'CLEANING' as const,
    priceType: 'HOURLY' as const,
    price: '120',
    serviceAreas: ['Soralia Village', 'Muizenberg', 'St James'],
    availability: { weekdays: true, weekends: true, evenings: false },
    images: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
      'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=400',
    ],
    portfolio: [],
    contactMethods: ['phone', 'email'],
    verified: false,
    rating: 4.5,
    reviewCount: 15,
    status: 'ACTIVE' as const,
    isPublished: true,
    termsAndConditions:
      'Eco-friendly products only. Keys handled securely. Satisfaction guarantee.',
    cancellationPolicy: '48hr notice required. Late cancellations may incur 50% charge.',
  },
  {
    id: 'svc-hoa-maintenance',
    providerId: 'user-hoa-services',
    title: 'HOA Community Maintenance Services',
    description:
      'Official HOA maintenance services including pool cleaning, common area upkeep, and emergency repairs. Services provided by certified HOA contractors.',
    category: 'MAINTENANCE' as const,
    priceType: 'FREE' as const,
    serviceAreas: ['Soralia Village'],
    availability: { weekdays: true, weekends: false, evenings: false },
    images: [
      'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400',
    ],
    portfolio: [],
    contactMethods: ['phone', 'email'],
    verified: true,
    rating: 4.2,
    reviewCount: 45,
    status: 'ACTIVE' as const,
    isPublished: true,
    termsAndConditions:
      'Services provided as part of HOA membership. Emergency services prioritized.',
    cancellationPolicy: 'Non-emergency services require 48hr notice.',
  },
  {
    id: 'svc-appliance-repair',
    providerId: 'user-mike-johnson',
    title: 'Appliance Repair Services',
    description:
      'Repair and maintenance of household appliances including washing machines, dishwashers, ovens, and refrigerators.',
    category: 'APPLIANCE_REPAIR' as const,
    priceType: 'QUOTE' as const,
    serviceAreas: ['Soralia Village', 'Muizenberg'],
    availability: { weekdays: true, weekends: true, evenings: false },
    images: ['https://images.unsplash.com/photo-1621905252478-2f1d6c0a6b2f?w=400'],
    portfolio: [],
    contactMethods: ['phone', 'email'],
    verified: false,
    rating: 0,
    reviewCount: 0,
    status: 'DRAFT' as const,
    isPublished: false,
    termsAndConditions: 'Parts charged at cost plus 20%. 3-month workmanship guarantee.',
    cancellationPolicy: 'Callout fee applies for no-show appointments.',
  },
  {
    id: 'svc-pest-control',
    providerId: 'user-cape-plumbing',
    title: 'Pest Control & Prevention',
    description:
      'Professional pest control services using environmentally friendly methods. Ants, cockroaches, rodents, and other common pests.',
    category: 'PEST_CONTROL' as const,
    priceType: 'FIXED' as const,
    price: '850',
    serviceAreas: ['Soralia Village', 'Muizenberg', 'St James'],
    availability: { weekdays: true, weekends: false, evenings: false },
    licenseNumber: 'PEST-2024-0123',
    insuranceExpiry: new Date('2026-06-30'),
    images: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400'],
    portfolio: [],
    contactMethods: ['phone', 'email'],
    verified: true,
    rating: 4.6,
    reviewCount: 9,
    status: 'ACTIVE' as const,
    isPublished: true,
    termsAndConditions:
      'Eco-friendly treatments only. 90-day guarantee. Follow-up inspections included.',
    cancellationPolicy: '24hr notice required. Late cancellations charged at 50%.',
  },
  {
    id: 'svc-security',
    providerId: 'user-hoa-services',
    title: 'Security System Installation & Maintenance',
    description:
      'HOA-approved security services including alarm systems, CCTV installation, and access control systems. Competitive rates for community members.',
    category: 'SECURITY' as const,
    priceType: 'QUOTE' as const,
    serviceAreas: ['Soralia Village'],
    availability: { weekdays: true, weekends: false, evenings: false },
    images: [
      'https://images.unsplash.com/photo-1558002038-1055907df827?w=400',
      'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400',
    ],
    portfolio: [],
    contactMethods: ['phone', 'email'],
    verified: true,
    rating: 4.4,
    reviewCount: 7,
    status: 'ACTIVE' as const,
    isPublished: true,
    termsAndConditions:
      'HOA-approved equipment only. Professional installation guaranteed. 2-year warranty.',
    cancellationPolicy: 'Standard cancellation terms apply. Deposit may be non-refundable.',
  },
].map(s => ({
  ...s,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
}));

const SERVICE_REVIEWS = [
  {
    id: 'review-gardening-1',
    listingId: 'svc-gardening',
    reviewerId: 'user-john-smith',
    rating: 5,
    title: 'Excellent service!',
    comment:
      'Mike did a fantastic job on our garden. Very professional and the results are amazing. Highly recommended!',
    serviceDate: new Date('2026-03-15'),
    responseQuality: 5,
    isPublished: true,
  },
  {
    id: 'review-plumbing-1',
    listingId: 'svc-plumbing',
    reviewerId: 'user-sarah-mitchell',
    rating: 5,
    title: 'Emergency plumbing heroes!',
    comment:
      'Called them at 2am for a burst pipe. They arrived within an hour and fixed everything perfectly. Lifesavers!',
    serviceDate: new Date('2026-03-20'),
    responseQuality: 5,
    isPublished: true,
  },
  {
    id: 'review-electrical-1',
    listingId: 'svc-electrical',
    reviewerId: 'user-michael-chen',
    rating: 4,
    title: 'Good work, fair price',
    comment:
      'Peter replaced our faulty outlets. Work was done well and he explained everything clearly. Would use again.',
    serviceDate: new Date('2026-03-10'),
    responseQuality: 4,
    isPublished: true,
  },
  {
    id: 'review-cleaning-1',
    listingId: 'svc-cleaning',
    reviewerId: 'user-emma-williams',
    rating: 5,
    title: 'Spotless!',
    comment:
      'Linda did an amazing deep clean of our home. Very thorough and used eco-friendly products as promised.',
    serviceDate: new Date('2026-03-25'),
    responseQuality: 5,
    isPublished: true,
  },
].map(r => ({
  ...r,
  tenantId: TENANT_ID,
  createdAt: now,
}));

const GROUPS = [
  {
    id: 'group-gardening',
    name: 'Gardening Group',
    description: 'Share tips, seeds, and plants with fellow gardening enthusiasts.',
    category: 'gardening',
    color: '#22c55e',
    isPublic: true,
    residentFilter: 'ALL' as const,
    ownerId: 'user-john-smith',
  },
  {
    id: 'group-fitness',
    name: 'Fitness Group',
    description: 'Stay active with morning walks, yoga, and group workouts.',
    category: 'fitness',
    color: '#f59e0b',
    isPublic: true,
    residentFilter: 'ALL' as const,
    ownerId: 'user-michael-chen',
  },
  {
    id: 'group-book-club',
    name: 'Book Club',
    description: 'Monthly book discussions and author visits.',
    category: 'book-club',
    color: '#8b5cf6',
    isPublic: true,
    residentFilter: 'ALL' as const,
    ownerId: 'user-emma-williams',
  },
  {
    id: 'group-cooking',
    name: 'Cooking Club',
    description: 'Share recipes, potlucks, and cooking demonstrations.',
    category: 'cooking',
    color: '#ef4444',
    isPublic: true,
    residentFilter: 'ALL' as const,
    ownerId: 'user-emma-williams',
  },
  {
    id: 'group-photography',
    name: 'Photography Club',
    description: 'Capture beautiful moments in Soralia Village.',
    category: 'photography',
    color: '#06b6d4',
    isPublic: true,
    residentFilter: 'ALL' as const,
    ownerId: 'user-michael-chen',
  },
  {
    id: 'group-volunteering',
    name: 'Volunteering Group',
    description: 'Make a difference in our community through service.',
    category: 'volunteering',
    color: '#ec4899',
    isPublic: true,
    residentFilter: 'ALL' as const,
    ownerId: 'user-sarah-mitchell',
  },
].map(g => ({
  ...g,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
}));

const USER_GROUPS = [
  {
    id: 'ug-john-gardening',
    userId: 'user-john-smith',
    groupId: 'group-gardening',
    role: 'ADMIN' as const,
  },
  {
    id: 'ug-sarah-gardening',
    userId: 'user-sarah-mitchell',
    groupId: 'group-gardening',
    role: 'ADMIN' as const,
  },
  {
    id: 'ug-michael-fitness',
    userId: 'user-michael-chen',
    groupId: 'group-fitness',
    role: 'ADMIN' as const,
  },
  {
    id: 'ug-emma-bookclub',
    userId: 'user-emma-williams',
    groupId: 'group-book-club',
    role: 'ADMIN' as const,
  },
  {
    id: 'ug-john-bookclub',
    userId: 'user-john-smith',
    groupId: 'group-book-club',
    role: 'MEMBER' as const,
  },
  {
    id: 'ug-anna-bookclub',
    userId: 'user-anna-patel',
    groupId: 'group-book-club',
    role: 'MEMBER' as const,
  },
  {
    id: 'ug-michael-photography',
    userId: 'user-michael-chen',
    groupId: 'group-photography',
    role: 'ADMIN' as const,
  },
  {
    id: 'ug-lisa-photography',
    userId: 'user-lisa-chen',
    groupId: 'group-photography',
    role: 'MEMBER' as const,
  },
  {
    id: 'ug-emma-cooking',
    userId: 'user-emma-williams',
    groupId: 'group-cooking',
    role: 'ADMIN' as const,
  },
  {
    id: 'ug-anna-cooking',
    userId: 'user-anna-patel',
    groupId: 'group-cooking',
    role: 'MEMBER' as const,
  },
  {
    id: 'ug-priya-cooking',
    userId: 'user-priya-naidoo',
    groupId: 'group-cooking',
    role: 'MEMBER' as const,
  },
  {
    id: 'ug-david-volunteering',
    userId: 'user-david-vdm',
    groupId: 'group-volunteering',
    role: 'ADMIN' as const,
  },
  {
    id: 'ug-marcus-volunteering',
    userId: 'user-marcus-johnson',
    groupId: 'group-volunteering',
    role: 'MEMBER' as const,
  },
  {
    id: 'ug-fatima-gardening',
    userId: 'user-fatima-hassan',
    groupId: 'group-gardening',
    role: 'MEMBER' as const,
  },
].map(ug => ({
  ...ug,
  tenantId: TENANT_ID,
  joinedAt: now,
}));

const RESOURCES = [
  // Architectural
  {
    id: 'res-arch-review-form',
    title: 'Architectural Review Application Form',
    description:
      'Complete this form before making any exterior modifications to your property. Includes guidelines for paint colours, fencing, landscaping, and structural changes. All applications require board approval.',
    category: 'ARCHITECTURAL' as const,
    fileUrl: '/resources/docs/architectural-review-form.pdf',
    fileType: 'application/pdf',
    fileSize: 245000,
    version: '3.2',
    visibility: 'ALL_RESIDENTS' as const,
    authorId: 'user-sarah-mitchell',
    publishedAt: new Date('2026-01-15'),
  },
  {
    id: 'res-arch-guidelines',
    title: 'Architectural Design Guidelines',
    description:
      'Comprehensive guidelines for all exterior modifications including approved colour palettes, fencing specifications, roofing materials, and landscaping requirements for Soralia Village.',
    category: 'ARCHITECTURAL' as const,
    fileUrl: '/resources/docs/design-guidelines.pdf',
    fileType: 'application/pdf',
    fileSize: 1820000,
    version: '2.0',
    visibility: 'ALL_RESIDENTS' as const,
    authorId: 'user-sarah-mitchell',
    publishedAt: new Date('2025-11-01'),
  },
  // Engineering
  {
    id: 'res-eng-site-plan',
    title: 'Master Site Plan',
    description:
      'Engineering site plan showing all phases of Soralia Village development, including road layouts, utility corridors, common areas, and future expansion zones.',
    category: 'ENGINEERING' as const,
    fileUrl: '/resources/docs/master-site-plan.pdf',
    fileType: 'application/pdf',
    fileSize: 4500000,
    version: '1.5',
    visibility: 'ALL_RESIDENTS' as const,
    authorId: 'user-david-vdm',
    publishedAt: new Date('2025-06-20'),
  },
  {
    id: 'res-eng-drainage',
    title: 'Stormwater Drainage Plan',
    description:
      'Detailed drainage engineering plans for the estate. Important for understanding water flow and flood risk areas. Updated after 2025 wet season improvements.',
    category: 'ENGINEERING' as const,
    fileUrl: '/resources/docs/drainage-plan.pdf',
    fileType: 'application/pdf',
    fileSize: 3200000,
    version: '2.1',
    visibility: 'ALL_RESIDENTS' as const,
    authorId: 'user-david-vdm',
    publishedAt: new Date('2025-09-10'),
  },
  // Governance
  {
    id: 'res-gov-hoa-rules',
    title: 'HOA Conduct Rules & Bylaws',
    description:
      'The official rules and regulations governing Soralia Village. Covers noise restrictions, pet policies, parking regulations, rental restrictions, and dispute resolution procedures. All residents must comply.',
    category: 'GOVERNANCE' as const,
    fileUrl: '/resources/docs/hoa-rules-bylaws.pdf',
    fileType: 'application/pdf',
    fileSize: 890000,
    version: '4.0',
    visibility: 'ALL_RESIDENTS' as const,
    authorId: 'user-sarah-mitchell',
    publishedAt: new Date('2026-02-01'),
  },
  {
    id: 'res-gov-constitution',
    title: 'HOA Constitution',
    description:
      'The constitution of the Soralia Village Homeowners Association. Defines the legal structure, membership obligations, board elections, and amendment procedures.',
    category: 'GOVERNANCE' as const,
    fileUrl: '/resources/docs/hoa-constitution.pdf',
    fileType: 'application/pdf',
    fileSize: 520000,
    version: '2.3',
    visibility: 'ALL_RESIDENTS' as const,
    authorId: 'user-sarah-mitchell',
    publishedAt: new Date('2025-03-15'),
  },
  {
    id: 'res-gov-meeting-minutes-template',
    title: 'AGM Meeting Minutes Template',
    description:
      'Standard template for recording annual general meeting minutes. Use this format for all community meetings to ensure consistent record keeping.',
    category: 'GOVERNANCE' as const,
    fileUrl: '/resources/docs/agm-minutes-template.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 45000,
    version: '1.0',
    visibility: 'COMMITTEE_ONLY' as const,
    authorId: 'user-robert-wilson',
    publishedAt: new Date('2025-08-01'),
  },
  // Financial
  {
    id: 'res-fin-annual-budget',
    title: 'Annual Budget 2026',
    description:
      'Detailed budget breakdown for the 2026 financial year including maintenance reserves, insurance, utilities, and capital improvement allocations.',
    category: 'FINANCIAL' as const,
    fileUrl: '/resources/docs/annual-budget-2026.pdf',
    fileType: 'application/pdf',
    fileSize: 680000,
    version: '1.0',
    visibility: 'OWNERS_ONLY' as const,
    authorId: 'user-robert-wilson',
    publishedAt: new Date('2026-01-10'),
  },
  {
    id: 'res-fin-levy-schedule',
    title: 'Monthly Levy Schedule',
    description:
      'Current levy amounts per unit type, payment due dates, and penalty structure for late payments. Includes breakdown of what levies cover.',
    category: 'FINANCIAL' as const,
    fileUrl: '/resources/docs/levy-schedule.pdf',
    fileType: 'application/pdf',
    fileSize: 180000,
    version: '2026.1',
    visibility: 'OWNERS_ONLY' as const,
    authorId: 'user-robert-wilson',
    publishedAt: new Date('2026-01-01'),
  },
  // Legal
  {
    id: 'res-legal-title-deed-guide',
    title: 'Title Deed Conditions',
    description:
      'Consolidated title deed conditions applicable to all properties in Soralia Village. Includes servitudes, building line restrictions, and usage limitations.',
    category: 'LEGAL' as const,
    fileUrl: '/resources/docs/title-deed-conditions.pdf',
    fileType: 'application/pdf',
    fileSize: 1200000,
    version: '1.0',
    visibility: 'OWNERS_ONLY' as const,
    authorId: 'user-david-vdm',
    publishedAt: new Date('2025-04-20'),
  },
  {
    id: 'res-legal-rental-agreement',
    title: 'Standard Rental Agreement Template',
    description:
      'HOA-approved rental agreement template that must be used for all lease arrangements. Includes clauses requiring tenant registration with the HOA.',
    category: 'LEGAL' as const,
    fileUrl: '/resources/docs/rental-agreement-template.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 95000,
    version: '3.0',
    visibility: 'OWNERS_ONLY' as const,
    authorId: 'user-david-vdm',
    publishedAt: new Date('2025-07-15'),
  },
  // DIY
  {
    id: 'res-diy-garden-guide',
    title: 'Water-Wise Gardening Guide',
    description:
      'Practical guide to maintaining a beautiful garden while conserving water. Includes indigenous plant recommendations, irrigation tips, and seasonal planting calendars for the Cape region.',
    category: 'DIY' as const,
    fileUrl: '/resources/docs/water-wise-gardening.pdf',
    fileType: 'application/pdf',
    fileSize: 2100000,
    version: '1.0',
    visibility: 'ALL_RESIDENTS' as const,
    authorId: 'user-john-smith',
    publishedAt: new Date('2025-10-01'),
  },
  {
    id: 'res-diy-home-maintenance',
    title: 'Home Maintenance Checklist',
    description:
      'Seasonal home maintenance checklist to keep your property in top condition. Covers gutters, plumbing, electrical, painting, and garden upkeep tasks.',
    category: 'DIY' as const,
    fileUrl: '/resources/docs/home-maintenance-checklist.pdf',
    fileType: 'application/pdf',
    fileSize: 340000,
    version: '1.0',
    visibility: 'ALL_RESIDENTS' as const,
    authorId: 'user-john-smith',
    publishedAt: new Date('2025-12-01'),
  },
  // Board Reports
  {
    id: 'res-board-q4-2025',
    title: 'Board Report Q4 2025',
    description:
      'Quarterly board report covering maintenance updates, financial summary, community initiatives, and upcoming projects for Q4 2025.',
    category: 'BOARD_REPORT' as const,
    fileUrl: '/resources/docs/board-report-q4-2025.pdf',
    fileType: 'application/pdf',
    fileSize: 750000,
    version: '1.0',
    visibility: 'ALL_RESIDENTS' as const,
    authorId: 'user-sarah-mitchell',
    publishedAt: new Date('2025-12-20'),
  },
].map(r => ({
  ...r,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
}));

const CONTENT_ITEMS = [
  {
    id: 'news-alien-plant-removal',
    title: { en: 'Successful Alien Plant Removal Initiative' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Our community volunteers removed over 500 invasive alien plants from the wetland area this month, including Port Jackson willows and Australian acacias. This effort has significantly improved the habitat for our endemic fynbos species.',
            },
          ],
        },
      ],
    },
    excerpt: { en: '500+ invasive plants removed by volunteers' },
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
    category: 'NEWS' as const,
    tags: ['conservation', 'volunteering', 'environment', 'wetlands', 'fynbos'],
    authorId: 'user-david-vdm',
    published: true,
    featured: true,
    publishedAt: new Date('2026-03-15'),
  },
  {
    id: 'news-bird-species',
    title: { en: 'New Bird Species Spotted in Reserve' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'A rare African palm swift has been spotted in our conservation area, marking the 47th bird species recorded in Soralia Nature Reserve. The sighting was confirmed by local ornithologist Dr. Naidoo during the annual bird count.',
            },
          ],
        },
      ],
    },
    excerpt: { en: '47th bird species recorded in Soralia Nature Reserve' },
    image: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&q=80',
    category: 'NEWS' as const,
    tags: ['conservation', 'birds', 'wildlife', 'nature', 'reserve'],
    authorId: 'user-david-vdm',
    published: true,
    featured: false,
    publishedAt: new Date('2026-02-28'),
  },
  {
    id: 'news-community-hall-renovation',
    title: { en: 'Community Hall Renovation Complete' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The long-awaited community hall renovation has been completed on time and within budget. The upgraded facility now includes a modern kitchen, improved lighting, and wheelchair-accessible restrooms. Bookings are now open for all residents.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Upgraded facility now available for bookings' },
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80',
    category: 'ANNOUNCEMENT' as const,
    tags: ['community', 'facilities', 'renovation', 'bookings'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: true,
    publishedAt: new Date('2026-04-01'),
  },
  {
    id: 'blog-gardening-tips',
    title: { en: 'Spring Gardening Tips for Soralia Residents' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'As spring arrives in our beautiful community, here are some tips for maintaining your garden. Remember to use drought-resistant plants native to our fynbos region to help conserve water and support local wildlife.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Essential tips for spring gardening in our climate' },
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
    category: 'BLOG' as const,
    tags: ['gardening', 'spring', 'tips', 'fynbos', 'water-conservation'],
    authorId: 'user-john-smith',
    published: true,
    featured: false,
    publishedAt: new Date('2026-03-01'),
  },
  {
    id: 'blog-photography-fynbos',
    title: { en: 'Capturing Fynbos: A Photography Guide' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The golden hour light transforms our local fynbos vegetation into something magical. Here are my tips for capturing the beauty of our unique ecosystem with your camera, including the best locations and times for photography in Soralia.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Tips for capturing our unique fynbos ecosystem' },
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&q=80',
    category: 'BLOG' as const,
    tags: ['photography', 'fynbos', 'nature', 'tips'],
    authorId: 'user-michael-chen',
    published: true,
    featured: false,
    publishedAt: new Date('2026-02-15'),
  },
  {
    id: 'announcement-pool-maintenance',
    title: { en: 'Community Pool Schedule Update' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Due to increased usage this summer, we will be performing weekly maintenance on the community pool every Tuesday from 8-10 AM. The pool will be closed during this time. We apologize for any inconvenience.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Weekly pool maintenance every Tuesday 8-10 AM' },
    category: 'ANNOUNCEMENT' as const,
    tags: ['pool', 'maintenance', 'schedule', 'facilities'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: false,
    publishedAt: new Date('2026-04-05'),
  },
  {
    id: 'conservation-wetland-update',
    title: { en: 'Wetland Restoration Progress Report' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Six months into our wetland restoration project, we have seen remarkable improvements. Water quality tests show a 40% reduction in nutrient runoff, and three new frog species have returned to the area. The indigenous plantings are thriving.',
            },
          ],
        },
      ],
    },
    excerpt: { en: '40% reduction in nutrient runoff, new species returning' },
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&q=80',
    category: 'CONSERVATION' as const,
    tags: ['wetland', 'restoration', 'conservation', 'wildlife', 'water-quality'],
    authorId: 'user-david-vdm',
    published: true,
    featured: true,
    publishedAt: new Date('2026-03-20'),
  },
  // Profile blog posts
  {
    id: 'blog-yoga-beginners',
    title: { en: 'Finding Peace Through Morning Yoga' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'In our busy community life, finding moments of peace is essential. Yoga has been transformative for me - both physically and mentally. Here are some poses I recommend for beginners, and how our beautiful Soralia surroundings make the perfect backdrop for morning practice.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'How morning yoga transformed my daily routine' },
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    category: 'BLOG' as const,
    tags: ['yoga', 'wellness', 'mindfulness', 'morning-routine'],
    authorId: 'user-priya-naidoo',
    published: true,
    featured: false,
    publishedAt: new Date('2026-03-10'),
  },
  {
    id: 'blog-leaseholder-experience',
    title: { en: 'Life as a Leaseholder in Soralia' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Being a leaseholder in Soralia Village has been an incredible experience. The community is so welcoming, and I love being able to participate in all the activities. The platform makes it easy to connect with neighbours and stay informed about community events.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Why renting in Soralia feels like home' },
    category: 'BLOG' as const,
    tags: ['leaseholder', 'community', 'experience', 'welcoming'],
    authorId: 'user-anna-patel',
    published: true,
    featured: false,
    publishedAt: new Date('2026-02-20'),
  },
  {
    id: 'blog-football-community',
    title: { en: 'Building Community Through Football' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Football has always been my passion, and I believe it can bring our community together. I have been organising informal kickabouts at the community park on Saturday afternoons, and the turnout has been amazing. Let us make it a regular thing!',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'How Saturday football brings neighbours together' },
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
    category: 'BLOG' as const,
    tags: ['football', 'community', 'sports', 'fitness'],
    authorId: 'user-james-okonkwo',
    published: true,
    featured: false,
    publishedAt: new Date('2026-03-25'),
  },
  {
    id: 'blog-art-garden',
    title: { en: 'Painting the Soralia Landscape' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'There is something magical about the way the light hits the mountains behind our village at sunset. As both an artist and a gardener, I find endless inspiration in the natural beauty surrounding us. Here are some of my recent paintings inspired by our community.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Finding artistic inspiration in our community gardens' },
    image: 'https://images.unsplash.com/photo-1460661419201-fd405786f2a0?w=800&q=80',
    category: 'BLOG' as const,
    tags: ['art', 'painting', 'gardening', 'landscape', 'inspiration'],
    authorId: 'user-fatima-hassan',
    published: true,
    featured: false,
    publishedAt: new Date('2026-04-05'),
  },
  {
    id: 'blog-fitness-routine',
    title: { en: 'My Fitness Journey in Soralia' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Moving to Soralia was the best thing for my fitness routine. The walking trails, the community park, and the amazing group of fitness enthusiasts here have kept me motivated. Here is my weekly routine and how I stay active.',
            },
          ],
        },
      ],
    },
    excerpt: { en: "Staying fit with Soralia's trails and community" },
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    category: 'BLOG' as const,
    tags: ['fitness', 'running', 'trails', 'wellness', 'community'],
    authorId: 'user-marcus-johnson',
    published: true,
    featured: false,
    publishedAt: new Date('2026-03-18'),
  },
  // Conservation page content
  {
    id: 'conservation-wetland-ecosystem',
    title: { en: 'Soralia Wetland Ecosystem' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Our Living Wetland' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The Soralia wetland is a vital part of our local ecosystem, providing habitat for diverse flora and fauna while naturally filtering stormwater runoff. Our conservation programme focuses on restoring and protecting this precious natural resource for future generations.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Current Projects' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Alien invasive plant removal — over 500 Port Jackson willows and Australian acacias removed to date',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Indigenous fynbos replanting along wetland buffers using locally sourced seed',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Water quality monitoring programme with monthly testing for nutrients, pH, and turbidity',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Bird and frog species census — 47 bird species and 8 frog species recorded',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'How You Can Help' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Join our monthly community cleanup days, participate in planting events, or simply keep the wetland areas free of litter. Every contribution makes a difference. Contact David van der Merwe to get involved.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Protecting and restoring our local wetland ecosystem' },
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&q=80',
    category: 'CONSERVATION' as const,
    tags: ['wetland', 'ecosystem', 'conservation', 'biodiversity'],
    authorId: 'user-david-vdm',
    published: true,
    featured: true,
    publishedAt: new Date('2026-01-15'),
  },
  {
    id: 'conservation-fynbos-guide',
    title: { en: 'Indigenous Fynbos Species of Soralia' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The Cape Floristic Region is home to over 9,000 plant species, many found nowhere else on Earth. Soralia Village sits within this unique biodiversity hotspot. Here is a guide to some of the fynbos species you can find in and around our community.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'King Protea (Protea cynaroides)' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: "South Africa's national flower, the King Protea blooms from January to April. Look for them on the southern slopes of the reserve after the first autumn rains.",
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Cape Sugarbird & Erica Species' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The Cape Sugarbird depends entirely on protea and erica species for nectar. By protecting these plants, we protect the birds. Over 20 erica species have been recorded in our reserve.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'A guide to the unique fynbos species in our community' },
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&q=80',
    category: 'CONSERVATION' as const,
    tags: ['fynbos', 'protea', 'biodiversity', 'indigenous-plants', 'cape-floral-kingdom'],
    authorId: 'user-david-vdm',
    published: true,
    featured: false,
    publishedAt: new Date('2026-02-10'),
  },
  {
    id: 'conservation-bird-count',
    title: { en: 'Annual Bird Count Results 2026' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: "This year's annual bird count recorded 47 species — up from 42 last year. Highlights include the first confirmed sighting of an African palm swift in the reserve, and a 30% increase in sunbird populations following our erica planting programme.",
            },
          ],
        },
      ],
    },
    excerpt: { en: '47 species recorded — a new high for Soralia' },
    image: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&q=80',
    category: 'CONSERVATION' as const,
    tags: ['birds', 'bird-count', 'wildlife', 'citizen-science', 'palm-swift'],
    authorId: 'user-david-vdm',
    published: true,
    featured: false,
    publishedAt: new Date('2026-04-12'),
  },
  // Campaign: Proudly Soralia
  {
    id: 'campaign-proudly-soralia',
    title: { en: 'Proudly Soralia' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Proudly Soralia 🌿' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Proudly Soralia is our community pride campaign — a celebration of everything that makes Soralia Village special. From our stunning natural surroundings to the people who call this place home, we are building a community we can all be proud of.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'What Is Proudly Soralia?' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Inspired by the Proudly South African movement, Proudly Soralia encourages every resident to take ownership of our shared spaces, support local businesses within our community, and actively participate in making Soralia the best place to live.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Our Pillars' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: '🌱 ' },
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      content: [{ type: 'text', text: 'Environmental Stewardship' }],
                    },
                    {
                      type: 'text',
                      text: ' — Protect our wetlands, plant indigenous gardens, reduce waste, and conserve water',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: '🤝 ' },
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      content: [{ type: 'text', text: 'Community Spirit' }],
                    },
                    {
                      type: 'text',
                      text: ' — Welcome new neighbours, participate in events, and look out for one another',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: '🏡 ' },
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      content: [{ type: 'text', text: 'Property Pride' }],
                    },
                    {
                      type: 'text',
                      text: ' — Maintain your property to the highest standards and contribute to our streetscape beauty',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: '🎨 ' },
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      content: [{ type: 'text', text: 'Local Talent' }],
                    },
                    {
                      type: 'text',
                      text: ' — Showcase your skills, share your services, and support community businesses',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: '📚 ' },
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      content: [{ type: 'text', text: 'Lifelong Learning' }],
                    },
                    {
                      type: 'text',
                      text: ' — Share knowledge, attend workshops, and grow together as a community',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Get Involved' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Every resident can be part of Proudly Soralia. Start by taking the pledge, joining a community event, or nominating a neighbour who embodies the spirit of Soralia. Together, we make this community extraordinary.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Tag your Soralia moments with #ProudlySoralia on social media and share what makes our community special.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'A celebration of everything that makes Soralia Village special' },
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    category: 'CAMPAIGN' as const,
    tags: ['proudly-soralia', 'community', 'pride', 'campaign', 'engagement'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: true,
    publishedAt: new Date('2026-04-01'),
  },
  // Events as Content items (for news page Events tab)
  {
    id: 'event-content-plant-swap',
    title: { en: 'Monthly Plant Swap' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Exchange plants, seeds, and cuttings with fellow gardeners. Bring at least one plant to swap. All skill levels welcome. Refreshments provided.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📅 25 May 2026 at 10:00 AM' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📍 Community Garden' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '👤 Organised by Sarah Mitchell' }],
        },
      ],
    },
    excerpt: { en: 'Share plants, seeds, and gardening tips with neighbours' },
    image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800&q=80',
    category: 'EVENT' as const,
    tags: ['plant-swap', 'gardening', 'community', 'free'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-01'),
    expiresAt: new Date('2026-05-26'),
  },
  {
    id: 'event-content-yoga',
    title: { en: 'Morning Yoga in the Park' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Free yoga session for all levels. Bring your own mat. Suitable for beginners and experienced practitioners. Led by certified instructor Priya Naidoo.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📅 20 May 2026 at 7:00 AM' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📍 Community Park' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '👤 Led by Priya Naidoo' }],
        },
      ],
    },
    excerpt: { en: 'Free yoga for all levels in the Community Park' },
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    category: 'EVENT' as const,
    tags: ['yoga', 'fitness', 'wellness', 'free', 'morning'],
    authorId: 'user-priya-naidoo',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-01'),
    expiresAt: new Date('2026-05-21'),
  },
  {
    id: 'event-content-book-club',
    title: { en: 'Book Club: "The Promise" by Damon Galgut' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Monthly book discussion. This month we are reading The Promise by Damon Galgut, winner of the Booker Prize. New members always welcome.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📅 28 May 2026 at 6:30 PM' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📍 Community Hall' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '👤 Organised by Emma Williams' }],
        },
      ],
    },
    excerpt: { en: 'Monthly book discussion — The Promise by Damon Galgut' },
    category: 'EVENT' as const,
    tags: ['book-club', 'reading', 'discussion', 'community-hall'],
    authorId: 'user-emma-williams',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-01'),
    expiresAt: new Date('2026-05-29'),
  },
  {
    id: 'event-content-agm',
    title: { en: 'Annual General Meeting 2026' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Annual General Meeting of the Soralia Village Homeowners Association. Agenda includes financial report, board elections, and community updates. All owners must attend.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📅 15 June 2026 at 7:00 PM' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📍 Community Hall' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '👤 Board of Directors' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Agenda' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Welcome and apologies' }] },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Confirmation of minutes from previous AGM' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Financial report and budget approval' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Board elections' }] },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Community updates and Q&A' }],
                },
              ],
            },
          ],
        },
      ],
    },
    excerpt: { en: 'All owners must attend — financial report, board elections, and updates' },
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
    category: 'EVENT' as const,
    tags: ['agm', 'meeting', 'board', 'elections', 'mandatory'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: true,
    publishedAt: new Date('2026-05-01'),
    expiresAt: new Date('2026-06-16'),
  },
  {
    id: 'event-content-aloe-workshop',
    title: { en: 'Aloe Photography Workshop' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Learn how to capture stunning photos of our iconic aloe plants. Professional photographer Michael Chen will share tips on composition, lighting, and macro photography techniques.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📅 30 May 2026 at 8:00 AM' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📍 Soralia Nature Reserve' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '👤 Led by Michael Chen' }],
        },
      ],
    },
    excerpt: { en: 'Learn macro photography techniques with our iconic aloe plants' },
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80',
    category: 'EVENT' as const,
    tags: ['photography', 'aloe', 'workshop', 'nature', 'macro'],
    authorId: 'user-michael-chen',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-01'),
    expiresAt: new Date('2026-05-31'),
  },
  {
    id: 'event-content-braai',
    title: { en: 'Community Braai & Social' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Join your neighbours for a relaxed community braai. Bring your own meat and drinks. Sides and desserts provided by the social committee. Entertainment and activities for children.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📅 7 June 2026 at 4:00 PM' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📍 Community Park' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '👤 Social Committee' }],
        },
      ],
    },
    excerpt: { en: 'Relaxed community braai — bring your meat, sides provided' },
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    category: 'EVENT' as const,
    tags: ['braai', 'social', 'community', 'family', 'food'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-15'),
    expiresAt: new Date('2026-06-08'),
  },
  {
    id: 'event-content-cleanup',
    title: { en: 'Community Cleanup Day' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Help keep Soralia beautiful! Join us for a community cleanup of common areas, trails, and the wetland. Gloves and bags provided. Refreshments and thank-you braai afterwards.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📅 14 June 2026 at 8:00 AM' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📍 Meeting Point: Community Hall' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '👤 Organised by David van der Merwe' }],
        },
      ],
    },
    excerpt: { en: 'Help keep Soralia beautiful — gloves and braai provided' },
    category: 'EVENT' as const,
    tags: ['cleanup', 'volunteering', 'community', 'environment', 'wetland'],
    authorId: 'user-david-vdm',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-15'),
    expiresAt: new Date('2026-06-15'),
  },
].map(c => ({
  ...c,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
}));

const EVENTS = [
  {
    id: 'event-plant-swap',
    title: 'Monthly Plant Swap',
    description:
      'Exchange plants, seeds, and cuttings with fellow gardeners. Bring at least one plant to swap. All skill levels welcome. Refreshments provided.',
    date: new Date('2026-05-25T10:00:00+02:00'),
    location: 'Community Garden',
    organizer: 'Sarah Mitchell',
    image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800&q=80',
    isPublic: true,
  },
  {
    id: 'event-morning-yoga',
    title: 'Morning Yoga in the Park',
    description:
      'Free yoga session for all levels. Bring your own mat. Suitable for beginners and experienced practitioners. Led by certified instructor Priya Naidoo.',
    date: new Date('2026-05-20T07:00:00+02:00'),
    location: 'Community Park',
    organizer: 'Priya Naidoo',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    isPublic: true,
  },
  {
    id: 'event-book-club-meeting',
    title: 'Book Club: "The Promise" by Damon Galgut',
    description:
      'Monthly book discussion. This month we are reading The Promise by Damon Galgut, winner of the Booker Prize. New members always welcome.',
    date: new Date('2026-05-28T18:30:00+02:00'),
    location: 'Community Hall',
    organizer: 'Emma Williams',
    isPublic: true,
  },
  {
    id: 'event-agm-2026',
    title: 'Annual General Meeting 2026',
    description:
      'Annual General Meeting of the Soralia Village Homeowners Association. Agenda includes financial report, board elections, and community updates. All owners must attend.',
    date: new Date('2026-06-15T19:00:00+02:00'),
    location: 'Community Hall',
    organizer: 'Board of Directors',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
    isPublic: true,
  },
  {
    id: 'event-aloe-photography-workshop',
    title: 'Aloe Photography Workshop',
    description:
      'Learn how to capture stunning photos of our iconic aloe plants. Professional photographer Michael Chen will share tips on composition, lighting, and macro photography techniques.',
    date: new Date('2026-05-30T08:00:00+02:00'),
    location: 'Soralia Nature Reserve',
    organizer: 'Michael Chen',
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80',
    isPublic: true,
  },
  {
    id: 'event-community-braai',
    title: 'Community Braai & Social',
    description:
      'Join your neighbours for a relaxed community braai. Bring your own meat and drinks. Sides and desserts provided by the social committee. Entertainment and activities for children.',
    date: new Date('2026-06-07T16:00:00+02:00'),
    location: 'Community Park',
    organizer: 'Social Committee',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    isPublic: true,
  },
  {
    id: 'event-cleanup-day',
    title: 'Community Cleanup Day',
    description:
      'Help keep Soralia beautiful! Join us for a community cleanup of common areas, trails, and the wetland. Gloves and bags provided. Refreshments and thank-you braai afterwards.',
    date: new Date('2026-06-14T08:00:00+02:00'),
    location: 'Meeting Point: Community Hall',
    organizer: 'David van der Merwe',
    isPublic: true,
  },
].map(e => ({
  ...e,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
}));

const SURVEYS = [
  {
    id: 'survey-community-priorities',
    title: 'Community Priorities Survey 2026',
    description:
      "Help us understand what matters most to you as a resident. Your feedback will guide the board's priorities and budget allocation for the coming year.",
    type: 'INTERNAL' as const,
    status: 'ACTIVE' as const,
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-06-30'),
  },
  {
    id: 'survey-facility-feedback',
    title: 'Community Hall Facility Feedback',
    description:
      'Now that the hall renovation is complete, we would love your feedback on the upgraded facilities and any suggestions for further improvements.',
    type: 'INTERNAL' as const,
    status: 'ACTIVE' as const,
    startDate: new Date('2026-04-10'),
    endDate: new Date('2026-05-31'),
  },
  {
    id: 'survey-event-interest',
    title: '2026 Event Interest Poll',
    description:
      'Which events would you like to see more of? Vote for your favourites and suggest new ideas for community activities.',
    type: 'INTERNAL' as const,
    status: 'CLOSED' as const,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-02-28'),
  },
].map(s => ({
  ...s,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
}));

const SURVEY_QUESTIONS = [
  // Community Priorities Survey questions
  {
    id: 'q-priorities-1',
    surveyId: 'survey-community-priorities',
    text: 'Which area should the board prioritise in 2026?',
    type: 'SINGLE_CHOICE' as const,
    options: [
      'Road maintenance',
      'Security upgrades',
      'Landscaping',
      'Community facilities',
      'Conservation projects',
    ],
    required: true,
    order: 1,
  },
  {
    id: 'q-priorities-2',
    surveyId: 'survey-community-priorities',
    text: 'How satisfied are you with the current state of common areas?',
    type: 'RATING' as const,
    options: ['1', '2', '3', '4', '5'],
    required: true,
    order: 2,
  },
  {
    id: 'q-priorities-3',
    surveyId: 'survey-community-priorities',
    text: 'Would you support an increase in levies to fund additional security?',
    type: 'YES_NO' as const,
    options: ['Yes', 'No'],
    required: true,
    order: 3,
  },
  {
    id: 'q-priorities-4',
    surveyId: 'survey-community-priorities',
    text: 'What other suggestions do you have for improving our community?',
    type: 'TEXT' as const,
    options: [],
    required: false,
    order: 4,
  },
  // Facility Feedback questions
  {
    id: 'q-facility-1',
    surveyId: 'survey-facility-feedback',
    text: 'How would you rate the renovated community hall?',
    type: 'RATING' as const,
    options: ['1', '2', '3', '4', '5'],
    required: true,
    order: 1,
  },
  {
    id: 'q-facility-2',
    surveyId: 'survey-facility-feedback',
    text: 'Which improvements do you find most valuable?',
    type: 'MULTIPLE_CHOICE' as const,
    options: ['Modern kitchen', 'Improved lighting', 'Wheelchair access', 'Restrooms', 'Parking'],
    required: true,
    order: 2,
  },
  {
    id: 'q-facility-3',
    surveyId: 'survey-facility-feedback',
    text: 'Any additional suggestions for the hall?',
    type: 'TEXT' as const,
    options: [],
    required: false,
    order: 3,
  },
  // Event Interest questions
  {
    id: 'q-events-1',
    surveyId: 'survey-event-interest',
    text: 'Which events would you like to see more frequently?',
    type: 'MULTIPLE_CHOICE' as const,
    options: [
      'Plant swaps',
      'Yoga sessions',
      'Book clubs',
      'Community braais',
      'Photography walks',
      'Kids activities',
      'Fitness classes',
    ],
    required: true,
    order: 1,
  },
  {
    id: 'q-events-2',
    surveyId: 'survey-event-interest',
    text: 'What day of the week works best for community events?',
    type: 'SINGLE_CHOICE' as const,
    options: [
      'Weekday mornings',
      'Weekday evenings',
      'Saturday mornings',
      'Saturday afternoons',
      'Sunday mornings',
    ],
    required: true,
    order: 2,
  },
].map(q => ({
  ...q,
  tenantId: TENANT_ID,
}));

const SURVEY_RESPONSES = [
  {
    id: 'resp-priorities-1',
    surveyId: 'survey-community-priorities',
    userId: 'user-john-smith',
    answers: {
      'q-priorities-1': 'Landscaping',
      'q-priorities-2': '4',
      'q-priorities-3': 'Yes',
      'q-priorities-4': 'More indigenous planting along the main entrance road.',
    },
  },
  {
    id: 'resp-priorities-2',
    surveyId: 'survey-community-priorities',
    userId: 'user-sarah-mitchell',
    answers: {
      'q-priorities-1': 'Security upgrades',
      'q-priorities-2': '3',
      'q-priorities-3': 'Yes',
      'q-priorities-4': '',
    },
  },
  {
    id: 'resp-priorities-3',
    surveyId: 'survey-community-priorities',
    userId: 'user-michael-chen',
    answers: {
      'q-priorities-1': 'Conservation projects',
      'q-priorities-2': '5',
      'q-priorities-3': 'No',
      'q-priorities-4': 'Great job on the wetland restoration! Keep it up.',
    },
  },
  {
    id: 'resp-facility-1',
    surveyId: 'survey-facility-feedback',
    userId: 'user-emma-williams',
    answers: {
      'q-facility-1': '5',
      'q-facility-2': ['Modern kitchen', 'Wheelchair access', 'Restrooms'],
      'q-facility-3': 'Would love to see a projector installed for movie nights.',
    },
  },
  {
    id: 'resp-facility-2',
    surveyId: 'survey-facility-feedback',
    userId: 'user-anna-patel',
    answers: {
      'q-facility-1': '4',
      'q-facility-2': ['Improved lighting', 'Restrooms'],
      'q-facility-3': '',
    },
  },
  {
    id: 'resp-events-1',
    surveyId: 'survey-event-interest',
    userId: 'user-john-smith',
    answers: {
      'q-events-1': ['Plant swaps', 'Community braais'],
      'q-events-2': 'Saturday mornings',
    },
  },
  {
    id: 'resp-events-2',
    surveyId: 'survey-event-interest',
    userId: 'user-priya-naidoo',
    answers: {
      'q-events-1': ['Yoga sessions', 'Fitness classes', 'Kids activities'],
      'q-events-2': 'Weekday mornings',
    },
  },
  {
    id: 'resp-events-3',
    surveyId: 'survey-event-interest',
    userId: 'user-marcus-johnson',
    answers: {
      'q-events-1': ['Photography walks', 'Community braais', 'Fitness classes'],
      'q-events-2': 'Saturday afternoons',
    },
  },
].map(r => ({
  ...r,
  tenantId: TENANT_ID,
  createdAt: now,
}));

const COMPETITIONS = [
  {
    id: 'comp-aloe-wonderland',
    title: 'Aloe in Wonderland',
    description:
      'Calling all photographers! Capture the beauty of our iconic aloe plants in bloom and stand a chance to win amazing prizes. We are looking for stunning shots that showcase the unique character of aloes in their natural habitat. Whether you are a professional or an amateur with a smartphone, everyone is welcome to enter.',
    rules:
      '1. Photos must feature aloe species photographed within Soralia Village or the nature reserve.\n2. Maximum 3 entries per person.\n3. Photos must be your own original work.\n4. Submit in JPEG or PNG format, minimum 2000px on the longest side.\n5. Include the aloe species name and location where possible.\n6. Entries must be submitted by the closing date.\n7. Winners will be selected by a panel of judges including a professional photographer and a botanist.',
    prizeInfo:
      "🥇 First Prize: R2,500 cash + featured on community website\n🥈 Second Prize: R1,500 cash\n🥉 Third Prize: R750 cash\n🏅 People's Choice: R500 voucher for local nursery",
    startDate: new Date('2026-04-01'),
    endDate: new Date('2026-07-31'),
    status: 'ACTIVE' as const,
    entryCount: 12,
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80',
  },
  {
    id: 'comp-garden-pride',
    title: 'Garden Pride 2026',
    description:
      'Show off your best garden! Enter our annual Garden Pride competition and inspire your neighbours with your green thumb. Categories include Best Indigenous Garden, Best Water-Wise Garden, and Best Container Garden.',
    rules:
      '1. Gardens must be within Soralia Village property boundaries.\n2. Submit 3-5 photos of your garden.\n3. Include a brief description of your garden design and plant selections.\n4. Gardens will be judged on creativity, sustainability, and visual appeal.\n5. Shortlisted gardens may be visited by judges for final assessment.',
    prizeInfo:
      '🥇 Best Overall: R3,000 garden centre voucher + trophy\n🥈 Best Indigenous Garden: R1,500 voucher\n🥉 Best Water-Wise Garden: R1,000 voucher\n🌺 Best Container Garden: R500 voucher',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-09-30'),
    status: 'DRAFT' as const,
    entryCount: 0,
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
  },
].map(c => ({
  ...c,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
}));

// ---------------------------------------------------------------------------
// Maintenance seed data
// ---------------------------------------------------------------------------

const MAINTENANCE_CATEGORIES = [
  {
    id: 'cat-plumbing',
    value: 'PLUMBING',
    label: 'Plumbing',
    description: 'Water supply, drainage, and pipe systems',
    isActive: true,
  },
  {
    id: 'cat-electrical',
    value: 'ELECTRICAL',
    label: 'Electrical',
    description: 'Power supply, wiring, and electrical fixtures',
    isActive: true,
  },
  {
    id: 'cat-hvac',
    value: 'HVAC',
    label: 'HVAC',
    description: 'Heating, ventilation, and air conditioning',
    isActive: true,
  },
  {
    id: 'cat-landscaping',
    value: 'LANDSCAPING',
    label: 'Landscaping',
    description: 'Gardens, irrigation, trees, and outdoor areas',
    isActive: true,
  },
  {
    id: 'cat-structural',
    value: 'STRUCTURAL',
    label: 'Structural',
    description: 'Building structure, walls, doors, windows',
    isActive: true,
  },
  {
    id: 'cat-network',
    value: 'NETWORK',
    label: 'Network',
    description: 'Internet, fibre, and network infrastructure',
    isActive: true,
  },
  {
    id: 'cat-waste',
    value: 'WASTE',
    label: 'Waste Management',
    description: 'Rubbish removal, recycling, and bulk waste',
    isActive: true,
  },
  {
    id: 'cat-security',
    value: 'SECURITY',
    label: 'Security',
    description: 'Alarm systems, CCTV, and access control',
    isActive: true,
  },
  {
    id: 'cat-other',
    value: 'OTHER',
    label: 'Other',
    description: "Requests that don't fit other categories",
    isActive: true,
  },
].map(c => ({
  ...c,
  tenantId: TENANT_ID,
  createdAt: now,
}));

const MAINTENANCE_TEAMS = [
  {
    id: 'team-plumbing',
    name: 'Plumbing Team',
    trade: 'PLUMBING',
    contactName: 'Thabo Mokoena',
    isActive: true,
  },
  {
    id: 'team-electrical',
    name: 'Electrical Team',
    trade: 'ELECTRICAL',
    contactName: 'Sarah van der Merwe',
    isActive: true,
  },
  {
    id: 'team-landscaping',
    name: 'Landscaping Team',
    trade: 'LANDSCAPING',
    contactName: 'David Nkosi',
    isActive: true,
  },
].map(t => ({
  ...t,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
}));

const SERVICE_PROVIDERS = [
  {
    id: 'prov-pipe-burst',
    companyName: 'PipeBurst Solutions Inc.',
    trade: 'PLUMBING',
    phone: '+27 82 555 0101',
    isActive: true,
  },
  {
    id: 'prov-tree-felling',
    companyName: 'TreeCare Pros',
    trade: 'LANDSCAPING',
    phone: '+27 82 555 0102',
    isActive: true,
  },
  {
    id: 'prov-electrical',
    companyName: 'VoltSafe Electrical',
    trade: 'ELECTRICAL',
    phone: '+27 82 555 0103',
    isActive: true,
  },
  {
    id: 'prov-network',
    companyName: 'FibreConnect ISP',
    trade: 'NETWORK',
    phone: '+27 82 555 0104',
    isActive: true,
  },
  {
    id: 'prov-waste',
    companyName: 'WasteWise Collectors',
    trade: 'WASTE',
    phone: '+27 82 555 0105',
    isActive: true,
  },
].map(p => ({
  ...p,
  tenantId: TENANT_ID,
  createdAt: now,
  updatedAt: now,
}));

const MAINTENANCE_REQUESTS = [
  {
    id: 'mr-irrigation-01',
    userId: 'user-john-smith',
    category: 'LANDSCAPING',
    priority: 'MEDIUM' as const,
    status: 'SUBMITTED' as const,
    ticketNumber: 'SRV-2026-0001',
    description:
      "The automated sprinkler system in the common garden area has been malfunctioning for the past week. Zones 3 and 4 aren't turning on, and zone 2 runs continuously.",
    images: [] as string[],
    createdAt: new Date(now.getTime() - 3 * 86400000),
    updatedAt: new Date(now.getTime() - 3 * 86400000),
  },
  {
    id: 'mr-burst-pipe',
    userId: 'user-sarah-mitchell',
    category: 'PLUMBING',
    priority: 'EMERGENCY' as const,
    status: 'IN_PROGRESS' as const,
    ticketNumber: 'SRV-2026-0002',
    assignedTeamId: 'team-plumbing',
    description:
      'Water pipe burst in the kitchen wall. Water damage spreading to ground floor. Need immediate shutdown of water supply to building B.',
    images: [] as string[],
    createdAt: new Date(now.getTime() - 12 * 3600000),
    updatedAt: new Date(now.getTime() - 2 * 3600000),
  },
  {
    id: 'mr-tree-felling',
    userId: 'user-michael-chen',
    category: 'LANDSCAPING',
    priority: 'HIGH' as const,
    status: 'SUBMITTED' as const,
    ticketNumber: 'SRV-2026-0003',
    description:
      "The old oak tree near the children's playground has a large dead branch hanging over the play area. Risk of it falling during the next storm.",
    images: [] as string[],
    createdAt: new Date(now.getTime() - 1 * 86400000),
    updatedAt: new Date(now.getTime() - 1 * 86400000),
  },
  {
    id: 'mr-network-outage',
    userId: 'user-john-smith',
    category: 'NETWORK',
    priority: 'HIGH' as const,
    status: 'IN_PROGRESS' as const,
    ticketNumber: 'SRV-2026-0004',
    assignedProviderId: 'prov-network',
    description:
      'Fiber optic cable cut by contractors during roadworks on the main access road. All units in Blocks A and B have no internet connectivity since yesterday. FibreConnect has been notified.',
    images: [] as string[],
    createdAt: new Date(now.getTime() - 2 * 86400000),
    updatedAt: new Date(now.getTime() - 6 * 3600000),
  },
  {
    id: 'mr-electrical-mains',
    userId: 'user-anna-patel',
    category: 'ELECTRICAL',
    priority: 'HIGH' as const,
    status: 'ASSIGNED' as const,
    ticketNumber: 'SRV-2026-0005',
    assignedTeamId: 'team-electrical',
    description:
      'Flickering lights and intermittent power surges in Block C units 20-30. Affects all rooms. Neighbors in adjacent units report similar issues. Seems to be related to the main supply line.',
    images: [] as string[],
    createdAt: new Date(now.getTime() - 4 * 86400000),
    updatedAt: new Date(now.getTime() - 1 * 86400000),
  },
  {
    id: 'mr-bin-removal',
    userId: 'user-sarah-mitchell',
    category: 'WASTE',
    priority: 'LOW' as const,
    status: 'CANCELLED' as const,
    ticketNumber: 'SRV-2026-0006',
    description:
      "Requesting removal of bulky waste (old furniture, mattresses) from unit 8. Normal bin collection can't handle these items.",
    images: [] as string[],
    createdAt: new Date(now.getTime() - 14 * 86400000),
    updatedAt: new Date(now.getTime() - 12 * 86400000),
  },
  {
    id: 'mr-garage-door',
    userId: 'user-michael-chen',
    category: 'STRUCTURAL',
    priority: 'LOW' as const,
    status: 'SUBMITTED' as const,
    ticketNumber: 'SRV-2026-0007',
    description:
      'The garage door at unit 17B has been sticking intermittently for the past 3 months. It makes a loud grinding noise when opening and sometimes gets stuck halfway. Have reported twice before but issue persists.',
    images: [] as string[],
    createdAt: new Date(now.getTime() - 90 * 86400000),
    updatedAt: new Date(now.getTime() - 5 * 86400000),
  },
].map(r => ({
  ...r,
  tenantId: TENANT_ID,
  images: r.images,
}));

const MAINTENANCE_SETTINGS = [
  { id: 'setting-ticket-format', key: 'ticket_number_format', value: 'SRV-{YYYY}-{NNNN}' },
].map(s => ({
  ...s,
  tenantId: TENANT_ID,
}));

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log('🌱 Seeding Soralia Village...\n');

  // Create or update tenant, then get its UUID
  console.log('Tenant...');
  const [tenant] = await db
    .insert(tenants)
    .values(TENANT)
    .onConflictDoUpdate({
      target: tenants.slug,
      set: { name: 'Soralia Village', primaryColor: '#4F46E5', active: true },
    })
    .returning();
  const TENANT_ID = tenant.id;
  console.log('  ✓ 1 tenant (id:', TENANT_ID, ')');

  // Fix any records that have old/slug tenantId values
  await db.update(users).set({ tenantId: TENANT_ID }).where(eq(users.tenantId, 'soralia'));
  await db.update(contents).set({ tenantId: TENANT_ID }).where(eq(contents.tenantId, 'soralia'));
  await db
    .update(properties)
    .set({ tenantId: TENANT_ID })
    .where(eq(properties.tenantId, 'soralia'));
  await db.update(events).set({ tenantId: TENANT_ID }).where(eq(events.tenantId, 'soralia'));
  await db.update(groups).set({ tenantId: TENANT_ID }).where(eq(groups.tenantId, 'soralia'));
  await db.update(resources).set({ tenantId: TENANT_ID }).where(eq(resources.tenantId, 'soralia'));
  await db.update(surveys).set({ tenantId: TENANT_ID }).where(eq(surveys.tenantId, 'soralia'));
  await db
    .update(competitions)
    .set({ tenantId: TENANT_ID })
    .where(eq(competitions.tenantId, 'soralia'));
  await db
    .update(households)
    .set({ tenantId: TENANT_ID })
    .where(eq(households.tenantId, 'soralia'));
  await db
    .update(standardSeats)
    .set({ tenantId: TENANT_ID })
    .where(eq(standardSeats.tenantId, 'soralia'));
  await db.update(profiles).set({ tenantId: TENANT_ID }).where(eq(profiles.tenantId, 'soralia'));
  await db
    .update(maintenanceCategories)
    .set({ tenantId: TENANT_ID })
    .where(eq(maintenanceCategories.tenantId, 'soralia'));
  await db
    .update(maintenanceTeams)
    .set({ tenantId: TENANT_ID })
    .where(eq(maintenanceTeams.tenantId, 'soralia'));
  await db
    .update(serviceProviders)
    .set({ tenantId: TENANT_ID })
    .where(eq(serviceProviders.tenantId, 'soralia'));
  await db
    .update(maintenanceRequests)
    .set({ tenantId: TENANT_ID })
    .where(eq(maintenanceRequests.tenantId, 'soralia'));
  await db.update(settings).set({ tenantId: TENANT_ID }).where(eq(settings.tenantId, 'soralia'));
  console.log(' ✓ Fixed tenantId on existing records');

  console.log('Users...');
  for (const user of USERS) {
    await db.insert(users).values(user).onConflictDoNothing();
  }
  console.log(`  ✓ ${USERS.length} users`);

  console.log('Properties...');
  for (const prop of PROPERTIES) {
    await db.insert(properties).values(prop).onConflictDoNothing();
  }
  console.log(`  ✓ ${PROPERTIES.length} properties`);

  console.log('Households...');
  for (const hh of HOUSEHOLDS) {
    await db.insert(households).values(hh).onConflictDoNothing();
  }
  console.log(`  ✓ ${HOUSEHOLDS.length} households`);

  console.log('Profiles...');
  for (const profile of PROFILES) {
    await db.insert(profiles).values(profile).onConflictDoNothing();
  }
  console.log(`  ✓ ${PROFILES.length} profiles`);

  console.log('Standard seats...');
  for (const seat of STANDARD_SEATS) {
    await db.insert(standardSeats).values(seat).onConflictDoNothing();
  }
  console.log(`  ✓ ${STANDARD_SEATS.length} standard seats`);

  console.log('Service listings...');
  for (const listing of SERVICE_LISTINGS) {
    await db.insert(communityServiceListings).values(listing).onConflictDoNothing();
  }
  console.log(`  ✓ ${SERVICE_LISTINGS.length} service listings`);

  console.log('Service reviews...');
  for (const review of SERVICE_REVIEWS) {
    await db.insert(communityServiceReviews).values(review).onConflictDoNothing();
  }
  console.log(`  ✓ ${SERVICE_REVIEWS.length} service reviews`);

  console.log('Groups...');
  for (const group of GROUPS) {
    await db.insert(groups).values(group).onConflictDoNothing();
  }
  console.log(`  ✓ ${GROUPS.length} groups`);

  console.log('Group memberships...');
  for (const membership of USER_GROUPS) {
    await db.insert(userGroups).values(membership).onConflictDoNothing();
  }
  console.log(`  ✓ ${USER_GROUPS.length} group memberships`);

  console.log('Resources...');
  for (const resource of RESOURCES) {
    await db.insert(resources).values(resource).onConflictDoNothing();
  }
  console.log(`  ✓ ${RESOURCES.length} resources`);

  console.log('News & Content...');
  for (const item of CONTENT_ITEMS) {
    await db
      .insert(contents)
      .values({ ...item, tenantId: TENANT_ID })
      .onConflictDoUpdate({
        target: contents.id,
        set: { tenantId: TENANT_ID },
      });
  }
  console.log(`  ✓ ${CONTENT_ITEMS.length} content items`);

  console.log('Events...');
  for (const event of EVENTS) {
    await db.insert(events).values(event).onConflictDoNothing();
  }
  console.log(`  ✓ ${EVENTS.length} events`);

  console.log('Surveys...');
  for (const survey of SURVEYS) {
    await db.insert(surveys).values(survey).onConflictDoNothing();
  }
  console.log(`  ✓ ${SURVEYS.length} surveys`);

  console.log('Survey questions...');
  for (const question of SURVEY_QUESTIONS) {
    await db.insert(questions).values(question).onConflictDoNothing();
  }
  console.log(`  ✓ ${SURVEY_QUESTIONS.length} questions`);

  console.log('Survey responses...');
  for (const response of SURVEY_RESPONSES) {
    await db.insert(responses).values(response).onConflictDoNothing();
  }
  console.log(`  ✓ ${SURVEY_RESPONSES.length} responses`);

  console.log('Competitions...');
  for (const competition of COMPETITIONS) {
    await db.insert(competitions).values(competition).onConflictDoNothing();
  }
  console.log(` ✓ ${COMPETITIONS.length} competitions`);

  console.log('Maintenance categories...');
  for (const cat of MAINTENANCE_CATEGORIES) {
    await db
      .insert(maintenanceCategories)
      .values({ ...cat, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }
  console.log(` ✓ ${MAINTENANCE_CATEGORIES.length} maintenance categories`);

  console.log('Maintenance teams...');
  for (const team of MAINTENANCE_TEAMS) {
    await db
      .insert(maintenanceTeams)
      .values({ ...team, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }
  console.log(` ✓ ${MAINTENANCE_TEAMS.length} maintenance teams`);

  console.log('Service providers...');
  for (const prov of SERVICE_PROVIDERS) {
    await db
      .insert(serviceProviders)
      .values({ ...prov, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }
  console.log(` ✓ ${SERVICE_PROVIDERS.length} service providers`);

  console.log('Maintenance requests...');
  for (const req of MAINTENANCE_REQUESTS) {
    await db
      .insert(maintenanceRequests)
      .values({ ...req, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }
  console.log(` ✓ ${MAINTENANCE_REQUESTS.length} maintenance requests`);

  console.log('Maintenance settings...');
  for (const setting of MAINTENANCE_SETTINGS) {
    await db
      .insert(settings)
      .values({ ...setting, tenantId: TENANT_ID })
      .onConflictDoNothing();
  }
  console.log(` ✓ ${MAINTENANCE_SETTINGS.length} maintenance settings`);

  console.log('\n✅ Seed complete!');
}

seed()
  .catch(e => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => pool.end());
