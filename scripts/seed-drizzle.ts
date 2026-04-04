import { db, tenants, users, households } from '../src/lib/db';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database with Drizzle...');

  // Get tenant IDs
  const tenantList = await db.select().from(tenants);
  const soraliaTenant = tenantList.find(t => t.slug === 'soralia');

  if (!soraliaTenant) {
    console.error('Soralia tenant not found!');
    return;
  }

  console.log('Using tenant:', soraliaTenant.id);

  // Create test users
  const testUsers = [
    {
      id: 'user-john-smith',
      tenantId: soraliaTenant.id,
      email: 'john.smith@soralia.org',
      name: 'John Smith',
      role: 'RESIDENT' as const,
      phone: '+27 82 123 4567',
      interests: ['gardening', 'tennis'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      isPublic: true,
      showEmail: true,
      showPhone: true,
      books: [],
      dashboardLayout: null,
      isActive: true,
      emailVerified: false,
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'user-sarah-mitchell',
      tenantId: soraliaTenant.id,
      email: 'sarah.mitchell@soralia.org',
      name: 'Sarah Mitchell',
      role: 'BOARD' as const,
      phone: '+27 82 234 5678',
      interests: ['gardening', 'book-club'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      isPublic: true,
      showEmail: true,
      showPhone: true,
      books: [],
      dashboardLayout: null,
      isActive: true,
      emailVerified: false,
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const user of testUsers) {
    await db.insert(users).values(user).onConflictDoNothing();
    console.log('Created user:', user.email);
  }

  // Create test household (using correct schema fields)
  await db
    .insert(households)
    .values({
      id: 'household-001',
      tenantId: soraliaTenant.id,
      street: '12 Soralia Lane',
      unit: '12',
      platformAddress: '12-soralia-lane',
      status: 'ACTIVE' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  console.log('Created household: 12 Soralia Lane');

  // Verify
  const userCount = await db.select().from(users).where(eq(users.tenantId, soraliaTenant.id));
  console.log(`\nSeeding complete! Created ${userCount.length} users.`);
}

seed().catch(console.error);
