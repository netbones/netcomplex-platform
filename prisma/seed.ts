import {
  PrismaClient,
  Role,
  GroupRole,
  ContentCategory,
  ResidentFilter,
  HouseholdStatus,
  OccupancyType,
  OccupantType,
  ServiceCategory,
  PriceType,
  ListingStatus,
  SoloSeatType,
  ResidencyType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const SORALIA_TENANT_ID = 'soralia-tenant-id';

  // Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'soralia' },
    update: {},
    create: {
      id: SORALIA_TENANT_ID,
      name: 'Soralia Village',
      slug: 'soralia',
      primaryColor: '#4F46E5',
      subscriptionTier: 'forest',
    },
  });

  // Create test users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'john.smith@soralia.org' },
      update: {},
      create: {
        id: 'user-john',
        tenantId: SORALIA_TENANT_ID,
        email: 'john.smith@soralia.org',
        name: 'John Smith',
        role: Role.RESIDENT,
        phone: '+27 82 123 4567',
        interests: ['gardening', 'tennis'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'sarah.mitchell@soralia.org' },
      update: {},
      create: {
        id: 'user-sarah',
        tenantId: SORALIA_TENANT_ID,
        email: 'sarah.mitchell@soralia.org',
        name: 'Sarah Mitchell',
        role: Role.BOARD,
        phone: '+27 82 234 5678',
        interests: ['gardening', 'book-club'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'michael.chen@soralia.org' },
      update: {},
      create: {
        id: 'user-michael',
        tenantId: SORALIA_TENANT_ID,
        email: 'michael.chen@soralia.org',
        name: 'Michael Chen',
        role: Role.RESIDENT,
        phone: '+27 82 345 6789',
        interests: ['fitness', 'photography'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'emma.williams@soralia.org' },
      update: {},
      create: {
        id: 'user-emma',
        tenantId: SORALIA_TENANT_ID,
        email: 'emma.williams@soralia.org',
        name: 'Emma Williams',
        role: Role.RESIDENT,
        phone: '+27 82 456 7890',
        interests: ['book-club', 'cooking'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'david.van.der.merwe@soralia.org' },
      update: {},
      create: {
        id: 'user-david',
        tenantId: SORALIA_TENANT_ID,
        email: 'david.van.der.merwe@soralia.org',
        name: 'David van der Merwe',
        role: Role.ADMIN,
        phone: '+27 82 567 8901',
        interests: ['volunteering', 'conservation'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'lisa.chen@soralia.org' },
      update: {},
      create: {
        id: 'user-lisa',
        tenantId: SORALIA_TENANT_ID,
        email: 'lisa.chen@soralia.org',
        name: 'Lisa Chen',
        role: Role.RESIDENT,
        phone: '+27 82 678 9012',
        interests: ['yoga', 'photography'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'robert.wilson@soralia.org' },
      update: {},
      create: {
        id: 'user-robert',
        tenantId: SORALIA_TENANT_ID,
        email: 'robert.wilson@soralia.org',
        name: 'Robert Wilson',
        role: Role.COMMITTEE,
        phone: '+27 82 789 0123',
        interests: ['governance', 'finance', 'community'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'anna.patel@soralia.org' },
      update: {},
      create: {
        id: 'user-anna',
        tenantId: SORALIA_TENANT_ID,
        email: 'anna.patel@soralia.org',
        name: 'Anna Patel',
        role: Role.RESIDENT,
        phone: '+27 82 890 1234',
        interests: ['cooking', 'gardening', 'book-club'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'marcus.johnson@soralia.org' },
      update: {},
      create: {
        id: 'user-marcus',
        tenantId: SORALIA_TENANT_ID,
        email: 'marcus.johnson@soralia.org',
        name: 'Marcus Johnson',
        role: Role.RESIDENT,
        phone: '+27 82 901 2345',
        interests: ['fitness', 'music', 'volunteering'],
        isPublic: true,
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Create Properties (Physical Assets)
  const properties = await Promise.all([
    prisma.property.upsert({
      where: { platformAddress: 'unit012@soralia.org' },
      update: {},
      create: {
        id: 'prop-012',
        tenantId: SORALIA_TENANT_ID,
        platformAddress: 'unit012@soralia.org',
        street: 'Pagoda Rd',
        unit: '12',
        ownerId: users[0].id, // John Smith
      },
    }),
    prisma.property.upsert({
      where: { platformAddress: 'unit008@soralia.org' },
      update: {},
      create: {
        id: 'prop-008',
        tenantId: SORALIA_TENANT_ID,
        platformAddress: 'unit008@soralia.org',
        street: 'Wild Almond Rd',
        unit: '8',
        ownerId: users[1].id, // Sarah Mitchell
      },
    }),
    prisma.property.upsert({
      where: { platformAddress: 'unit003@soralia.org' },
      update: {},
      create: {
        id: 'prop-003',
        tenantId: SORALIA_TENANT_ID,
        platformAddress: 'unit003@soralia.org',
        street: 'Silkypuff Street',
        unit: '3',
        ownerId: users[2].id, // Michael Chen
      },
    }),
    prisma.property.upsert({
      where: { platformAddress: 'unit005@soralia.org' },
      update: {},
      create: {
        id: 'prop-005',
        tenantId: SORALIA_TENANT_ID,
        platformAddress: 'unit005@soralia.org',
        street: 'Conebrush Rd',
        unit: '5',
        ownerId: users[6].id, // Robert Wilson
      },
    }),
  ]);

  console.log(`Created ${properties.length} properties`);

  // Create Households (Active Occupancies)
  const households = await Promise.all([
    prisma.household.upsert({
      where: { id: 'hh-012' },
      update: {},
      create: {
        id: 'hh-012',
        tenantId: SORALIA_TENANT_ID,
        propertyId: properties[0].id,
        occupancyType: OccupancyType.OWNER_OCCUPIED,
        status: HouseholdStatus.ACTIVE,
        moveInDate: new Date('2023-01-15'),
      },
    }),
    prisma.household.upsert({
      where: { id: 'hh-008' },
      update: {},
      create: {
        id: 'hh-008',
        tenantId: SORALIA_TENANT_ID,
        propertyId: properties[1].id,
        occupancyType: OccupancyType.OWNER_OCCUPIED,
        status: HouseholdStatus.ACTIVE,
        moveInDate: new Date('2022-08-20'),
      },
    }),
    prisma.household.upsert({
      where: { id: 'hh-003' },
      update: {},
      create: {
        id: 'hh-003',
        tenantId: SORALIA_TENANT_ID,
        propertyId: properties[2].id,
        occupancyType: OccupancyType.OWNER_OCCUPIED,
        status: HouseholdStatus.ACTIVE,
        moveInDate: new Date('2024-03-10'),
      },
    }),
    prisma.household.upsert({
      where: { id: 'hh-005' },
      update: {},
      create: {
        id: 'hh-005',
        tenantId: SORALIA_TENANT_ID,
        propertyId: properties[3].id,
        occupancyType: OccupancyType.RENTAL,
        status: HouseholdStatus.ACTIVE,
        moveInDate: new Date('2025-06-01'),
      },
    }),
  ]);

  console.log(`Created ${households.length} households`);

  // Create Standard Seats (Legal Property/Member association)
  await Promise.all([
    prisma.standardSeat.upsert({
      where: { userId_propertyId: { userId: users[0].id, propertyId: properties[0].id } },
      update: {},
      create: {
        id: 'seat-john',
        tenantId: SORALIA_TENANT_ID,
        userId: users[0].id,
        propertyId: properties[0].id,
        isPrimaryOwner: true,
        platformAddress: 'john.unit012@soralia.org',
      },
    }),
    prisma.standardSeat.upsert({
      where: { userId_propertyId: { userId: users[1].id, propertyId: properties[1].id } },
      update: {},
      create: {
        id: 'seat-sarah',
        tenantId: SORALIA_TENANT_ID,
        userId: users[1].id,
        propertyId: properties[1].id,
        isPrimaryOwner: true,
        platformAddress: 'sarah.unit008@soralia.org',
      },
    }),
    prisma.standardSeat.upsert({
      where: { userId_propertyId: { userId: users[2].id, propertyId: properties[2].id } },
      update: {},
      create: {
        id: 'seat-michael',
        tenantId: SORALIA_TENANT_ID,
        userId: users[2].id,
        propertyId: properties[2].id,
        isPrimaryOwner: true,
        platformAddress: 'michael.unit003@soralia.org',
      },
    }),
    prisma.standardSeat.upsert({
      where: { userId_propertyId: { userId: users[6].id, propertyId: properties[3].id } },
      update: {},
      create: {
        id: 'seat-robert',
        tenantId: SORALIA_TENANT_ID,
        userId: users[6].id,
        propertyId: properties[3].id,
        isPrimaryOwner: true,
        platformAddress: 'robert.unit005@soralia.org',
      },
    }),
  ]);

  // Create Profiles (Resident participation)
  await Promise.all([
    prisma.profile.upsert({
      where: { profileAddress: 'emma.unit012@soralia.org' },
      update: {},
      create: {
        id: 'prof-emma',
        tenantId: SORALIA_TENANT_ID,
        householdId: households[0].id,
        displayName: 'Emma Smith',
        profileAddress: 'emma.unit012@soralia.org',
        userId: users[3].id,
        occupantType: OccupantType.OCCUPANT,
        residencyType: ResidencyType.FAMILY,
      },
    }),
    prisma.profile.upsert({
      where: { profileAddress: 'lisa.unit003@soralia.org' },
      update: {},
      create: {
        id: 'prof-lisa',
        tenantId: SORALIA_TENANT_ID,
        householdId: households[2].id,
        displayName: 'Lisa Chen',
        profileAddress: 'lisa.unit003@soralia.org',
        userId: users[5].id,
        occupantType: OccupantType.OCCUPANT,
        residencyType: ResidencyType.FAMILY,
      },
    }),
    prisma.profile.upsert({
      where: { profileAddress: 'anna.unit005@soralia.org' },
      update: {},
      create: {
        id: 'prof-anna',
        tenantId: SORALIA_TENANT_ID,
        householdId: households[3].id,
        displayName: 'Anna Patel',
        profileAddress: 'anna.unit005@soralia.org',
        userId: users[7].id,
        occupantType: OccupantType.OCCUPANT,
        residencyType: ResidencyType.RENTER,
      },
    }),
  ]);

  // Create Interest Groups
  const groupData = [
    { id: 'group-gardening', name: 'Gardening Group', ownerId: users[0].id, color: '#22c55e' },
    { id: 'group-fitness', name: 'Fitness Group', ownerId: users[2].id, color: '#f59e0b' },
    { id: 'group-book-club', name: 'Book Club', ownerId: users[3].id, color: '#8b5cf6' },
  ];

  for (const g of groupData) {
    await prisma.group.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        tenantId: SORALIA_TENANT_ID,
        name: g.name,
        category: 'social',
        color: g.color,
        ownerId: g.ownerId,
      },
    });
  }

  // Create Maintenance Request (Asset linked)
  await prisma.maintenanceRequest.create({
    data: {
      id: 'req-001',
      tenantId: SORALIA_TENANT_ID,
      propertyId: properties[0].id,
      userId: users[0].id,
      category: 'plumbing',
      priority: 'HIGH',
      description: 'Burst pipe in front garden',
      status: 'SUBMITTED',
      updatedAt: new Date(),
    },
  });

  console.log('Seeding complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
