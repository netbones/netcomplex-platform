import { PrismaClient, Role, GroupRole, Group, UserGroup, ContentCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'john.smith@soralia.org' },
      update: {},
      create: {
        email: 'john.smith@soralia.org',
        name: 'John Smith',
        role: Role.RESIDENT,
        street: 'Pagoda Rd',
        unit: '12',
        phone: '+27 82 123 4567',
        interests: ['gardening', 'tennis'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'sarah.mitchell@soralia.org' },
      update: {},
      create: {
        email: 'sarah.mitchell@soralia.org',
        name: 'Sarah Mitchell',
        role: Role.BOARD,
        street: 'Wild Almond Rd',
        unit: '8',
        phone: '+27 82 234 5678',
        interests: ['gardening', 'book-club'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'michael.chen@soralia.org' },
      update: {},
      create: {
        email: 'michael.chen@soralia.org',
        name: 'Michael Chen',
        role: Role.RESIDENT,
        street: 'Silkypuff Street',
        unit: '3',
        phone: '+27 82 345 6789',
        interests: ['fitness', 'photography'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'emma.williams@soralia.org' },
      update: {},
      create: {
        email: 'emma.williams@soralia.org',
        name: 'Emma Williams',
        role: Role.RESIDENT,
        street: 'Beechwood Rd',
        unit: '15',
        phone: '+27 82 456 7890',
        interests: ['book-club', 'cooking'],
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'david.van.der.merwe@soralia.org' },
      update: {},
      create: {
        email: 'david.van.der.merwe@soralia.org',
        name: 'David van der Merwe',
        role: Role.ADMIN,
        street: 'Sugarbrush Rd',
        unit: '1',
        phone: '+27 82 567 8901',
        interests: ['volunteering', 'conservation'],
        isPublic: true,
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Create interest groups
  const groups = await Promise.all([
    prisma.group.upsert({
      where: { id: 'group-gardening' },
      update: {},
      create: {
        id: 'group-gardening',
        name: 'Gardening Club',
        description: 'Share tips, exchange plants, and grow beautiful gardens together.',
        category: 'gardening',
        isPublic: true,
        ownerId: users[1].id, // Sarah
      },
    }),
    prisma.group.upsert({
      where: { id: 'group-fitness' },
      update: {},
      create: {
        id: 'group-fitness',
        name: 'Fitness Group',
        description: 'Stay active with morning walks, yoga, and group workouts.',
        category: 'fitness',
        isPublic: true,
        ownerId: users[2].id, // Michael
      },
    }),
    prisma.group.upsert({
      where: { id: 'group-book-club' },
      update: {},
      create: {
        id: 'group-book-club',
        name: 'Book Club',
        description: 'Monthly book discussions and author visits.',
        category: 'book-club',
        isPublic: true,
        ownerId: users[3].id, // Emma
      },
    }),
    prisma.group.upsert({
      where: { id: 'group-cooking' },
      update: {},
      create: {
        id: 'group-cooking',
        name: 'Cooking Club',
        description: 'Share recipes, potlucks, and cooking demonstrations.',
        category: 'cooking',
        isPublic: true,
        ownerId: users[3].id, // Emma
      },
    }),
    prisma.group.upsert({
      where: { id: 'group-photography' },
      update: {},
      create: {
        id: 'group-photography',
        name: 'Photography Club',
        description: 'Capture beautiful moments in Soralia Village.',
        category: 'photography',
        isPublic: true,
        ownerId: users[2].id, // Michael
      },
    }),
    prisma.group.upsert({
      where: { id: 'group-volunteering' },
      update: {},
      create: {
        id: 'group-volunteering',
        name: 'Volunteering Group',
        description: 'Make a difference in our community through service.',
        category: 'volunteering',
        isPublic: true,
        ownerId: users[4].id, // David
      },
    }),
  ]);

  console.log(`Created ${groups.length} groups`);

  // Add users to groups
  const memberships = await Promise.all([
    prisma.userGroup.upsert({
      where: { userId_groupId: { userId: users[0].id, groupId: groups[0].id } },
      update: {},
      create: { userId: users[0].id, groupId: groups[0].id, role: GroupRole.MEMBER },
    }),
    prisma.userGroup.upsert({
      where: { userId_groupId: { userId: users[2].id, groupId: groups[1].id } },
      update: {},
      create: { userId: users[2].id, groupId: groups[1].id, role: GroupRole.ADMIN },
    }),
    prisma.userGroup.upsert({
      where: { userId_groupId: { userId: users[3].id, groupId: groups[2].id } },
      update: {},
      create: { userId: users[3].id, groupId: groups[2].id, role: GroupRole.ADMIN },
    }),
    prisma.userGroup.upsert({
      where: { userId_groupId: { userId: users[1].id, groupId: groups[0].id } },
      update: {},
      create: { userId: users[1].id, groupId: groups[0].id, role: GroupRole.ADMIN },
    }),
  ]);

  console.log(`Created ${memberships.length} group memberships`);

  // Create some events
  await Promise.all([
    prisma.event.upsert({
      where: { id: 'event-plant-swap' },
      update: {},
      create: {
        id: 'event-plant-swap',
        title: 'Monthly Plant Swap',
        description: 'Exchange plants with fellow gardeners',
        date: new Date('2026-04-05T10:00:00+02:00'),
        location: 'Community Garden',
        organizer: 'Sarah Mitchell',
      },
    }),
    prisma.event.upsert({
      where: { id: 'event-yoga' },
      update: {},
      create: {
        id: 'event-yoga',
        title: 'Morning Yoga',
        description: 'Free yoga session for all levels',
        date: new Date('2026-04-03T07:00:00+02:00'),
        location: 'Community Pool Area',
        organizer: 'Michael Chen',
      },
    }),
  ]);

  // Create content (news/articles)
  await Promise.all([
    prisma.content.upsert({
      where: { id: 'news-alien-plants' },
      update: {},
      create: {
        id: 'news-alien-plants',
        title: 'Successful Alien Plant Removal Initiative',
        content:
          'Our community volunteers removed over 500 invasive alien plants from the wetland area this month, including Port Jackson willows and Australian acacias. This effort has significantly improved the habitat for our endemic fynbos species.',
        excerpt: '500+ invasive plants removed by volunteers',
        category: 'NEWS',
        authorId: users[4].id,
        published: true,
        featured: true,
        publishedAt: new Date('2026-03-15'),
      },
    }),
    prisma.content.upsert({
      where: { id: 'news-bird-species' },
      update: {},
      create: {
        id: 'news-bird-species',
        title: 'New Bird Species Spotted in Reserve',
        content:
          'A rare African palm swift has been spotted in our conservation area, marking the 47th bird species recorded in Soralia Nature Reserve.',
        category: 'NEWS',
        authorId: users[4].id,
        published: true,
        publishedAt: new Date('2026-02-28'),
      },
    }),
    prisma.content.upsert({
      where: { id: 'news-water-quality' },
      update: {},
      create: {
        id: 'news-water-quality',
        title: 'Water Quality Monitoring Results',
        content:
          'Latest water quality tests show significant improvement in wetland health following our drainage restoration project.',
        category: 'NEWS',
        authorId: users[4].id,
        published: true,
        publishedAt: new Date('2026-02-10'),
      },
    }),
  ]);

  // Create settings
  const settings = await Promise.all([
    prisma.setting.upsert({
      where: { key: 'contact.emergency' },
      update: {},
      create: { key: 'contact.emergency', value: '+27 21 555-HELP' },
    }),
    prisma.setting.upsert({
      where: { key: 'contact.security' },
      update: {},
      create: { key: 'contact.security', value: '+27 21 555-SAFE' },
    }),
    prisma.setting.upsert({
      where: { key: 'contact.maintenance' },
      update: {},
      create: { key: 'contact.maintenance', value: '+27 21 555-FIXIT' },
    }),
    prisma.setting.upsert({
      where: { key: 'contact.office' },
      update: {},
      create: { key: 'contact.office', value: '+27 21 555-0000' },
    }),
  ]);

  console.log(`Created ${settings.length} settings`);

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
