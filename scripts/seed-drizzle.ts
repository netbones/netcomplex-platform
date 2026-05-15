/**
 * Seed script for Soralia Village.
 *
 * Imports from @schema/* (src/db/schema/) for database schema definitions.
 *
 * Run: pnpm db:seed
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { users } from '@schema/users';
import { properties } from '@schema/properties';
import { households } from '@schema/households';
import { profiles } from '@schema/profiles';
import { standardSeats } from '@schema/standard-seats';
import { tenants } from '@schema/tenants';

const connectionString = (process.env.DATABASE_URL ?? '').replace(
  'sslmode=require',
  'sslmode=no-verify'
);

const pool = new Pool({ connectionString, connectionTimeoutMillis: 15000 });
const db = drizzle(pool);

const TENANT_ID = 'soralia';
const now = new Date();

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TENANT = {
  id: TENANT_ID,
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
  },
  {
    id: 'user-sarah-mitchell',
    email: 'sarah.mitchell@soralia.org',
    name: 'Sarah Mitchell',
    role: 'BOARD' as const,
    phone: '+27 82 234 5678',
    interests: ['gardening', 'book-club'],
  },
  {
    id: 'user-michael-chen',
    email: 'michael.chen@soralia.org',
    name: 'Michael Chen',
    role: 'RESIDENT' as const,
    phone: '+27 82 345 6789',
    interests: ['fitness', 'photography'],
  },
  {
    id: 'user-emma-williams',
    email: 'emma.williams@soralia.org',
    name: 'Emma Williams',
    role: 'RESIDENT' as const,
    phone: '+27 82 456 7890',
    interests: ['book-club', 'cooking'],
  },
  {
    id: 'user-david-vdm',
    email: 'david.van.der.merwe@soralia.org',
    name: 'David van der Merwe',
    role: 'ADMIN' as const,
    phone: '+27 82 567 8901',
    interests: ['volunteering', 'conservation'],
  },
  {
    id: 'user-lisa-chen',
    email: 'lisa.chen@soralia.org',
    name: 'Lisa Chen',
    role: 'RESIDENT' as const,
    phone: '+27 82 678 9012',
    interests: ['yoga', 'photography'],
  },
  {
    id: 'user-robert-wilson',
    email: 'robert.wilson@soralia.org',
    name: 'Robert Wilson',
    role: 'COMMITTEE' as const,
    phone: '+27 82 789 0123',
    interests: ['governance', 'finance', 'community'],
  },
  {
    id: 'user-anna-patel',
    email: 'anna.patel@soralia.org',
    name: 'Anna Patel',
    role: 'RESIDENT' as const,
    phone: '+27 82 890 1234',
    interests: ['cooking', 'gardening', 'book-club'],
  },
  {
    id: 'user-marcus-johnson',
    email: 'marcus.johnson@soralia.org',
    name: 'Marcus Johnson',
    role: 'RESIDENT' as const,
    phone: '+27 82 901 2345',
    interests: ['fitness', 'music', 'volunteering'],
  },
  {
    id: 'user-priya-naidoo',
    email: 'priya.naidoo@soralia.org',
    name: 'Priya Naidoo',
    role: 'RESIDENT' as const,
    phone: '+27 82 012 3456',
    interests: ['yoga', 'cooking'],
  },
  {
    id: 'user-james-okonkwo',
    email: 'james.okonkwo@soralia.org',
    name: 'James Okonkwo',
    role: 'RESIDENT' as const,
    phone: '+27 82 111 2222',
    interests: ['football', 'community'],
  },
  {
    id: 'user-fatima-hassan',
    email: 'fatima.hassan@soralia.org',
    name: 'Fatima Hassan',
    role: 'RESIDENT' as const,
    phone: '+27 82 333 4444',
    interests: ['art', 'gardening'],
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
    homeImage: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
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
    street: 'Fynbos Ave',
    unit: '17',
    ownerId: 'user-anna-patel',
    homeImage: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800&q=80',
  },
  {
    id: 'prop-006',
    platformAddress: 'unit022@soralia.org',
    street: 'Protea Close',
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
    id: 'prof-robert',
    householdId: 'hh-004',
    userId: 'user-robert-wilson',
    displayName: 'Robert Wilson',
    profileAddress: 'robert.unit005@soralia.org',
    occupantType: 'OCCUPANT' as const,
    residencyType: 'OWNER_RESIDENT' as const,
    occupantSince: new Date('2025-06-01'),
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

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log('🌱 Seeding Soralia Village...\n');

  console.log('Tenant...');
  await db.insert(tenants).values(TENANT).onConflictDoNothing();
  console.log('  ✓ 1 tenant');

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

  console.log('\n✅ Seed complete!');
}

seed()
  .catch(e => {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => pool.end());
