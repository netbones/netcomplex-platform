/**
 * Data Migration Script: Explicit Renter Relationships
 * Run this after the schema migration completes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateExistingProfiles() {
  console.log('Starting profile migration to explicit renter relationships...');

  try {
    // Get all active profiles with household and owner information
    const profiles = await prisma.profile.findMany({
      where: { status: 'ACTIVE' },
      include: {
        household: {
          include: {
            standardSeats: {
              where: { isPrimaryOwner: true },
              include: { user: true },
            },
          },
        },
        user: true, // Include profile's user if it exists
      },
    });

    console.log(`Found ${profiles.length} active profiles to migrate`);

    let updatedCount = 0;

    for (const profile of profiles) {
      const primaryOwner = profile.household.standardSeats[0];

      if (primaryOwner) {
        // Determine residency type based on existing logic
        let residencyType: 'FAMILY' | 'RENTER' | 'OWNER_RESIDENT' = 'FAMILY';

        if (profile.occupantType === 'MINOR') {
          // Minors are always family
          residencyType = 'FAMILY';
        } else if (profile.userId) {
          // Adult occupants with user accounts are renters (can have independent access)
          residencyType = 'RENTER';
        } else {
          // Adult occupants without user accounts are family
          residencyType = 'FAMILY';
        }

        // Update the profile with explicit relationships
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            landlordId: primaryOwner.userId,
            residencyType: residencyType,
          },
        });

        updatedCount++;
        console.log(
          `Updated ${profile.displayName}: ${residencyType} under ${primaryOwner.user.name}`
        );
      } else {
        console.warn(
          `No primary owner found for profile ${profile.displayName} in household ${profile.householdId}`
        );
      }
    }

    console.log(`Migration completed: ${updatedCount} profiles updated`);

    // Verification: Check the results
    const renters = await prisma.profile.findMany({
      where: { residencyType: 'RENTER', status: 'ACTIVE' },
    });

    const family = await prisma.profile.findMany({
      where: { residencyType: 'FAMILY', status: 'ACTIVE' },
    });

    console.log(`Verification: ${renters.length} renters, ${family.length} family members`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateExistingProfiles()
  .then(() => console.log('✅ Migration successful'))
  .catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
