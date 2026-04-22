import 'dotenv/config';
import { db, users, properties, households, standardSeats } from '@api/db';

const SORALIA_TENANT_ID = 'soralia';

async function seed() {
  console.log('Seeding Soralia Village with Drizzle...\n');

  // ========== USERS ==========
  console.log('Creating users...');
  const testUsers = [
    {
      id: 'user-john-smith',
      tenantId: SORALIA_TENANT_ID,
      email: 'john.smith@soralia.org',
      name: 'John Smith',
      role: 'RESIDENT' as const,
      phone: '+27 82 123 4567',
      interests: ['gardening', 'tennis'],
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'user-sarah-mitchell',
      tenantId: SORALIA_TENANT_ID,
      email: 'sarah.mitchell@soralia.org',
      name: 'Sarah Mitchell',
      role: 'BOARD' as const,
      phone: '+27 82 234 5678',
      interests: ['gardening', 'book-club'],
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const user of testUsers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db
      .insert(users)
      .values(user as any)
      .onConflictDoNothing();
  }
  console.log(`Created ${testUsers.length} users`);

  // ========== PROPERTIES ==========
  console.log('Creating properties...');
  const testProperties = [
    {
      id: 'prop-001',
      tenantId: SORALIA_TENANT_ID,
      street: 'Pagoda Rd',
      unit: '12',
      platformAddress: 'unit012@soralia.org',
      ownerId: 'user-john-smith',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prop-002',
      tenantId: SORALIA_TENANT_ID,
      street: 'Wild Almond Rd',
      unit: '8',
      platformAddress: 'unit008@soralia.org',
      ownerId: 'user-sarah-mitchell',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const prop of testProperties) {
    await db.insert(properties).values(prop).onConflictDoNothing();
  }
  console.log(`Created ${testProperties.length} properties`);

  // ========== HOUSEHOLDS ==========
  console.log('Creating households...');
  const testHouseholds = [
    {
      id: 'hh-001',
      tenantId: SORALIA_TENANT_ID,
      propertyId: 'prop-001',
      occupancyType: 'OWNER_OCCUPIED' as const,
      status: 'ACTIVE' as const,
      moveInDate: new Date('2023-01-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'hh-002',
      tenantId: SORALIA_TENANT_ID,
      propertyId: 'prop-002',
      occupancyType: 'OWNER_OCCUPIED' as const,
      status: 'ACTIVE' as const,
      moveInDate: new Date('2022-08-20'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const hh of testHouseholds) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db
      .insert(households)
      .values(hh as any)
      .onConflictDoNothing();
  }
  console.log(`Created ${testHouseholds.length} households`);

  // ========== STANDARD SEATS ==========
  console.log('Creating standard seats...');
  const testStandardSeats = [
    {
      id: 'seat-john',
      tenantId: SORALIA_TENANT_ID,
      userId: 'user-john-smith',
      propertyId: 'prop-001',
      isPrimaryOwner: true,
      platformAddress: 'john.unit012@soralia.org',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const seat of testStandardSeats) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db
      .insert(standardSeats)
      .values(seat as any)
      .onConflictDoNothing();
  }
  console.log(`Created ${testStandardSeats.length} standard seats`);

  console.log('\n✅ Seeding complete!');
}

seed().catch(console.error);
