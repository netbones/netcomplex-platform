import {
  db,
  tenants,
  users,
  households,
  groups,
  userGroups,
  events,
  bookings,
  notifications,
  announcements,
  settings,
  conversations,
  messages,
  conversationParticipants,
} from '../src/lib/db';
import { eq, sql } from 'drizzle-orm';

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
      tenantId: SORALIA_TENANT_ID,
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
    {
      id: 'user-michael-chen',
      tenantId: SORALIA_TENANT_ID,
      email: 'michael.chen@soralia.org',
      name: 'Michael Chen',
      role: 'RESIDENT' as const,
      phone: '+27 82 345 6789',
      interests: ['fitness', 'photography'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
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
      id: 'user-emma-williams',
      tenantId: SORALIA_TENANT_ID,
      email: 'emma.williams@soralia.org',
      name: 'Emma Williams',
      role: 'RESIDENT' as const,
      phone: '+27 82 456 7890',
      interests: ['book-club', 'cooking'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
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
      id: 'user-david-vdm',
      tenantId: SORALIA_TENANT_ID,
      email: 'david.van.der.merwe@soralia.org',
      name: 'David van der Merwe',
      role: 'ADMIN' as const,
      phone: '+27 82 567 8901',
      interests: ['volunteering', 'conservation'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
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
      id: 'user-lisa-chen',
      tenantId: SORALIA_TENANT_ID,
      email: 'lisa.chen@soralia.org',
      name: 'Lisa Chen',
      role: 'RESIDENT' as const,
      phone: '+27 82 678 9012',
      interests: ['yoga', 'photography'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
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
      id: 'user-robert-wilson',
      tenantId: SORALIA_TENANT_ID,
      email: 'robert.wilson@soralia.org',
      name: 'Robert Wilson',
      role: 'COMMITTEE' as const,
      phone: '+27 82 789 0123',
      interests: ['governance', 'finance', 'community'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
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
      id: 'user-anna-patel',
      tenantId: SORALIA_TENANT_ID,
      email: 'anna.patel@soralia.org',
      name: 'Anna Patel',
      role: 'RESIDENT' as const,
      phone: '+27 82 890 1234',
      interests: ['cooking', 'gardening', 'book-club'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna',
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
      id: 'user-marcus-johnson',
      tenantId: SORALIA_TENANT_ID,
      email: 'marcus.johnson@soralia.org',
      name: 'Marcus Johnson',
      role: 'RESIDENT' as const,
      phone: '+27 82 901 2345',
      interests: ['fitness', 'music', 'volunteering'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
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
  }
  console.log(`Created ${testUsers.length} users`);

  // ========== HOUSEHOLDS ==========
  console.log('Creating households...');
  const testHouseholds = [
    {
      id: 'household-001',
      tenantId: SORALIA_TENANT_ID,
      street: 'Pagoda Rd',
      unit: '12',
      platformAddress: 'unit012@soralia.org',
      status: 'ACTIVE' as const,
      homeImage:
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop',
      moveInDate: new Date('2023-01-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'household-002',
      tenantId: SORALIA_TENANT_ID,
      street: 'Wild Almond Rd',
      unit: '8',
      platformAddress: 'unit008@soralia.org',
      status: 'ACTIVE' as const,
      homeImage:
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=400&fit=crop',
      moveInDate: new Date('2022-08-20'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'household-003',
      tenantId: SORALIA_TENANT_ID,
      street: 'Silkypuff Street',
      unit: '3',
      platformAddress: 'unit003@soralia.org',
      status: 'ACTIVE' as const,
      homeImage:
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=400&fit=crop',
      moveInDate: new Date('2024-03-10'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'household-004',
      tenantId: SORALIA_TENANT_ID,
      street: 'Conebrush Rd',
      unit: '5',
      platformAddress: 'unit005@soralia.org',
      status: 'ACTIVE' as const,
      homeImage:
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=400&fit=crop',
      moveInDate: new Date('2023-06-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const hh of testHouseholds) {
    await db.insert(households).values(hh).onConflictDoNothing();
  }
  console.log(`Created ${testHouseholds.length} households`);

  // ========== GROUPS ==========
  console.log('Creating groups...');
  const testGroups = [
    {
      id: 'group-gardening',
      tenantId: SORALIA_TENANT_ID,
      name: 'Gardening Group',
      description: 'Share tips, seeds, and plants with fellow gardening enthusiasts.',
      category: 'gardening',
      color: '#22c55e',
      isPublic: true,
      accessType: 'OPEN' as const,
      residentFilter: 'ALL' as const,
      isActive: true,
      ownerId: 'user-john-smith',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'group-fitness',
      tenantId: SORALIA_TENANT_ID,
      name: 'Fitness Group',
      description: 'Stay active with morning walks, yoga, and group workouts.',
      category: 'fitness',
      color: '#f59e0b',
      isPublic: true,
      accessType: 'OPEN' as const,
      residentFilter: 'ALL' as const,
      isActive: true,
      ownerId: 'user-michael-chen',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'group-book-club',
      tenantId: SORALIA_TENANT_ID,
      name: 'Book Club',
      description: 'Monthly book discussions and author visits.',
      category: 'book-club',
      color: '#8b5cf6',
      isPublic: true,
      accessType: 'OPEN' as const,
      residentFilter: 'ALL' as const,
      isActive: true,
      ownerId: 'user-emma-williams',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'group-cooking',
      tenantId: SORALIA_TENANT_ID,
      name: 'Cooking Club',
      description: 'Share recipes, potlucks, and cooking demonstrations.',
      category: 'cooking',
      color: '#ef4444',
      isPublic: true,
      accessType: 'OPEN' as const,
      residentFilter: 'ALL' as const,
      isActive: true,
      ownerId: 'user-emma-williams',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'group-photography',
      tenantId: SORALIA_TENANT_ID,
      name: 'Photography Club',
      description: 'Capture beautiful moments in Soralia Village.',
      category: 'photography',
      color: '#06b6d4',
      isPublic: true,
      accessType: 'OPEN' as const,
      residentFilter: 'ALL' as const,
      isActive: true,
      ownerId: 'user-michael-chen',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'group-volunteering',
      tenantId: SORALIA_TENANT_ID,
      name: 'Volunteering Group',
      description: 'Make a difference in our community through service.',
      category: 'volunteering',
      color: '#ec4899',
      isPublic: true,
      accessType: 'OPEN' as const,
      residentFilter: 'ALL' as const,
      isActive: true,
      ownerId: 'user-sarah-mitchell',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const group of testGroups) {
    await db.insert(groups).values(group).onConflictDoNothing();
  }
  console.log(`Created ${testGroups.length} groups`);

  // ========== USER GROUPS ==========
  console.log('Adding users to groups...');
  const testUserGroups = [
    {
      id: 'ug-1',
      tenantId: SORALIA_TENANT_ID,
      userId: 'user-john-smith',
      groupId: 'group-gardening',
      role: 'ADMIN' as const,
      joinedAt: new Date(),
    },
    {
      id: 'ug-2',
      tenantId: SORALIA_TENANT_ID,
      userId: 'user-sarah-mitchell',
      groupId: 'group-gardening',
      role: 'MEMBER' as const,
      joinedAt: new Date(),
    },
    {
      id: 'ug-3',
      tenantId: SORALIA_TENANT_ID,
      userId: 'user-michael-chen',
      groupId: 'group-fitness',
      role: 'ADMIN' as const,
      joinedAt: new Date(),
    },
    {
      id: 'ug-4',
      tenantId: SORALIA_TENANT_ID,
      userId: 'user-marcus-johnson',
      groupId: 'group-fitness',
      role: 'MEMBER' as const,
      joinedAt: new Date(),
    },
    {
      id: 'ug-5',
      tenantId: SORALIA_TENANT_ID,
      userId: 'user-emma-williams',
      groupId: 'group-book-club',
      role: 'ADMIN' as const,
      joinedAt: new Date(),
    },
    {
      id: 'ug-6',
      tenantId: SORALIA_TENANT_ID,
      userId: 'user-anna-patel',
      groupId: 'group-book-club',
      role: 'MEMBER' as const,
      joinedAt: new Date(),
    },
    {
      id: 'ug-7',
      tenantId: SORALIA_TENANT_ID,
      userId: 'user-sarah-mitchell',
      groupId: 'group-volunteering',
      role: 'ADMIN' as const,
      joinedAt: new Date(),
    },
    {
      id: 'ug-8',
      tenantId: SORALIA_TENANT_ID,
      userId: 'user-david-vdm',
      groupId: 'group-volunteering',
      role: 'MEMBER' as const,
      joinedAt: new Date(),
    },
  ];

  for (const ug of testUserGroups) {
    await db.insert(userGroups).values(ug).onConflictDoNothing();
  }
  console.log(`Added ${testUserGroups.length} user-group memberships`);

  // ========== EVENTS ==========
  console.log('Creating events...');
  const testEvents = [
    {
      id: 'event-1',
      tenantId: SORALIA_TENANT_ID,
      title: 'Community Braai',
      description: 'Monthly community braai at the clubhouse',
      date: new Date('2026-04-15'),
      location: 'Clubhouse',
      organizer: 'user-sarah-mitchell',
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'event-2',
      tenantId: SORALIA_TENANT_ID,
      title: 'Garden Tour',
      description: 'Annual garden tour showcasing beautiful gardens',
      date: new Date('2026-05-01'),
      location: 'Community Gardens',
      organizer: 'user-john-smith',
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'event-3',
      tenantId: SORALIA_TENANT_ID,
      title: 'Safety Meeting',
      description: 'Quarterly safety and security meeting',
      date: new Date('2026-04-20'),
      location: 'Community Hall',
      organizer: 'user-david-vdm',
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const event of testEvents) {
    await db.insert(events).values(event).onConflictDoNothing();
  }
  console.log(`Created ${testEvents.length} events`);

  // ========== SETTINGS ==========
  console.log('Creating settings...');
  const testSettings = [
    {
      id: 'setting-1',
      tenantId: SORALIA_TENANT_ID,
      key: 'communityName',
      value: 'Soralia Village',
    },
    { id: 'setting-2', tenantId: SORALIA_TENANT_ID, key: 'primaryColor', value: '#4F46E5' },
    {
      id: 'setting-3',
      tenantId: SORALIA_TENANT_ID,
      key: 'maintenanceEmergency',
      value: '+27 82 123 9999',
    },
    { id: 'setting-4', tenantId: SORALIA_TENANT_ID, key: 'bookingCancellationHours', value: '24' },
  ];

  for (const setting of testSettings) {
    await db.insert(settings).values(setting).onConflictDoNothing();
  }
  console.log(`Created ${testSettings.length} settings`);

  // ========== ANNOUNCEMENTS ==========
  console.log('Creating announcements...');
  const testAnnouncements = [
    {
      id: 'announce-1',
      tenantId: SORALIA_TENANT_ID,
      title: 'Welcome to Soralia Village',
      content: 'Welcome to our community portal! We are excited to have you here.',
      author: 'user-david-vdm',
      priority: 'high',
      createdAt: new Date(),
    },
    {
      id: 'announce-2',
      tenantId: SORALIA_TENANT_ID,
      title: 'Scheduled Maintenance',
      content: 'Water supply will be interrupted on Saturday from 9am-12pm for pipe repairs.',
      author: 'user-david-vdm',
      priority: 'normal',
      createdAt: new Date(),
    },
  ];

  for (const announce of testAnnouncements) {
    await db.insert(announcements).values(announce).onConflictDoNothing();
  }
  console.log(`Created ${testAnnouncements.length} announcements`);

  // ========== VERIFY ==========
  console.log('\n--- Verification ---');
  const userCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.tenantId, SORALIA_TENANT_ID));
  const hhCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(households)
    .where(eq(households.tenantId, SORALIA_TENANT_ID));
  const groupCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(groups)
    .where(eq(groups.tenantId, SORALIA_TENANT_ID));
  const eventCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(eq(events.tenantId, SORALIA_TENANT_ID));
  const announceCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(announcements)
    .where(eq(announcements.tenantId, SORALIA_TENANT_ID));

  console.log(`Users: ${userCount[0].count}`);
  console.log(`Households: ${hhCount[0].count}`);
  console.log(`Groups: ${groupCount[0].count}`);
  console.log(`Events: ${eventCount[0].count}`);
  console.log(`Announcements: ${announceCount[0].count}`);
  console.log('\n✅ Seeding complete!');
}

seed().catch(console.error);
