import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateIdentityData() {
  console.log('Starting identity data migration...\n');

  // 1. Create Households from OWNER users
  console.log('1. Creating Households from OWNER users...');

  const owners = await prisma.user.findMany({
    where: { residentType: 'OWNER' },
    select: { id: true, name: true, street: true, unit: true, homeImage: true },
  });

  const householdIds: Record<string, string> = {};

  for (const owner of owners) {
    if (!owner.street || !owner.unit) {
      console.log(`  - Skipping ${owner.name}: missing street/unit`);
      continue;
    }

    const existing = await prisma.household.findUnique({
      where: { street_unit: { street: owner.street, unit: owner.unit } },
    });

    if (existing) {
      console.log(`  - Household already exists for ${owner.street} ${owner.unit}`);
      householdIds[owner.id] = existing.id;
      continue;
    }

    const household = await prisma.household.create({
      data: {
        street: owner.street,
        unit: owner.unit,
        platformAddress: `unit${owner.unit}@soralia.org`,
        homeImage: owner.homeImage,
        status: 'ACTIVE',
      },
    });

    householdIds[owner.id] = household.id;
    console.log(`  - Created household for ${owner.street} ${owner.unit}`);
  }

  // 2. Create StandardSeats for owners
  console.log('\n2. Creating StandardSeats...');

  for (const [userId, householdId] of Object.entries(householdIds)) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const existingSeat = await prisma.standardSeat.findUnique({
      where: { userId_householdId: { userId, householdId } },
    });

    if (existingSeat) {
      console.log(`  - StandardSeat already exists for user ${userId}`);
      continue;
    }

    const platformAddress = `${user?.name.toLowerCase().replace(/\s+/g, '.')}.${householdId.substring(0, 3)}@soralia.org`;

    await prisma.standardSeat.create({
      data: {
        userId,
        householdId,
        isPrimaryOwner: true,
        platformAddress,
      },
    });

    console.log(`  - Created StandardSeat for user ${user?.name}`);
  }

  // 3. Create PremiumSeats for BOARD members (complimentary)
  console.log('\n3. Creating PremiumSeats for BOARD members...');

  const boardMembers = await prisma.user.findMany({
    where: { role: 'BOARD' },
  });

  for (const boardMember of boardMembers) {
    const existingSeat = await prisma.premiumSeat.findUnique({
      where: { userId: boardMember.id },
    });

    if (existingSeat) {
      console.log(`  - PremiumSeat already exists for board member ${boardMember.name}`);
      continue;
    }

    // Check if they're a resident (have street/unit) → RESIDENT type
    // Otherwise → MEMBER type
    const seatType = boardMember.street && boardMember.unit ? 'RESIDENT' : 'MEMBER';
    const platformAddress = `${boardMember.name.toLowerCase().replace(/\s+/g, '.')}@soralia.org`;

    await prisma.premiumSeat.create({
      data: {
        userId: boardMember.id,
        platformAddress,
        seatType,
        isComplimentary: true,
        householdId: householdIds[boardMember.id] || null,
      },
    });

    console.log(`  - Created PremiumSeat for ${boardMember.name} (${seatType}, complimentary)`);
  }

  // 4. Try to create Profiles for RENTER users
  console.log('\n4. Creating Profiles for RENTER users...');

  const renters = await prisma.user.findMany({
    where: { residentType: 'RENTER' },
  });

  for (const renter of renters) {
    if (!renter.street || !renter.unit) {
      console.log(`  - Skipping ${renter.name}: missing street/unit`);
      continue;
    }

    const household = await prisma.household.findUnique({
      where: { street_unit: { street: renter.street, unit: renter.unit } },
    });

    if (!household) {
      console.log(
        `  - No household found for renter ${renter.name} at ${renter.street} ${renter.unit}`
      );
      continue;
    }

    // Check if profile already exists
    const existingProfile = await prisma.profile.findFirst({
      where: {
        householdId: household.id,
        userId: renter.id,
      },
    });

    if (existingProfile) {
      console.log(`  - Profile already exists for renter ${renter.name}`);
      continue;
    }

    const profileAddress = `${renter.name.toLowerCase().replace(/\s+/g, '.')}.${household.unit}@soralia.org`;

    const profile = await prisma.profile.create({
      data: {
        householdId: household.id,
        displayName: renter.name,
        profileAddress,
        occupantType: 'OCCUPANT',
        occupantSince: renter.createdAt,
        userId: renter.id, // Link to user for upgrade path
        isPublic: renter.isPublic,
        showEmail: renter.showEmail,
        showPhone: renter.showPhone,
        status: 'ACTIVE',
      },
    });

    console.log(`  - Created Profile for ${renter.name} at ${household.street} ${household.unit}`);
  }

  console.log('\n✅ Migration complete!');

  // Summary
  const householdCount = await prisma.household.count();
  const seatCount = await prisma.standardSeat.count();
  const premiumCount = await prisma.premiumSeat.count();
  const profileCount = await prisma.profile.count();

  console.log('\n--- Summary ---');
  console.log(`Households: ${householdCount}`);
  console.log(`StandardSeats: ${seatCount}`);
  console.log(`PremiumSeats: ${premiumCount}`);
  console.log(`Profiles: ${profileCount}`);
}

migrateIdentityData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
