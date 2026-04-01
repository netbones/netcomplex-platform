import {
  PrismaClient,
  Role,
  GroupRole,
  Group,
  UserGroup,
  ContentCategory,
  ResidentFilter,
} from '@prisma/client';

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
        phone: '+27 82 123 4567',
        interests: ['gardening', 'tennis'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
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
        phone: '+27 82 234 5678',
        interests: ['gardening', 'book-club'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
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
        phone: '+27 82 345 6789',
        interests: ['fitness', 'photography'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
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
        phone: '+27 82 456 7890',
        interests: ['book-club', 'cooking'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
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
        phone: '+27 82 567 8901',
        interests: ['volunteering', 'conservation'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'lisa.chen@soralia.org' },
      update: {},
      create: {
        email: 'lisa.chen@soralia.org',
        name: 'Lisa Chen',
        role: Role.RESIDENT,
        phone: '+27 82 678 9012',
        interests: ['yoga', 'photography'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
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
        name: 'Gardening Group',
        description: 'Share tips, seeds, and plants with fellow gardening enthusiasts.',
        category: 'gardening',
        color: '#22c55e',
        isPublic: true,
        residentFilter: ResidentFilter.ALL,
        ownerId: users[0].id, // John
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
        color: '#f59e0b',
        isPublic: true,
        residentFilter: ResidentFilter.ALL,
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
        color: '#8b5cf6',
        isPublic: true,
        residentFilter: ResidentFilter.ALL,
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
        color: '#ef4444',
        isPublic: true,
        residentFilter: ResidentFilter.ALL,
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
        color: '#06b6d4',
        isPublic: true,
        residentFilter: ResidentFilter.ALL,
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
        color: '#ec4899',
        isPublic: true,
        residentFilter: ResidentFilter.ALL,
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

  // Create content (news/articles) with tags
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
        tags: ['conservation', 'volunteering', 'environment', 'wetlands', 'fynbos'],
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
        tags: ['conservation', 'birds', 'wildlife', 'nature', 'reserve'],
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
        tags: ['environment', 'water', 'conservation', 'wetlands', 'restoration'],
        authorId: users[4].id,
        published: true,
        publishedAt: new Date('2026-02-10'),
      },
    }),
    // Add more content with varied tags for different users
    prisma.content.upsert({
      where: { id: 'blog-gardening-tips' },
      update: {},
      create: {
        id: 'blog-gardening-tips',
        title: 'Spring Gardening Tips for Soralia Residents',
        content:
          'As spring arrives in our beautiful community, here are some tips for maintaining your garden. Remember to use drought-resistant plants native to our fynbos region to help conserve water and support local wildlife.',
        excerpt: 'Essential tips for spring gardening in our climate',
        category: 'BLOG',
        tags: ['gardening', 'spring', 'tips', 'fynbos', 'water-conservation', 'wildlife'],
        authorId: users[0].id, // John Smith
        published: true,
        publishedAt: new Date('2026-03-01'),
      },
    }),
    prisma.content.upsert({
      where: { id: 'blog-fitness-routine' },
      update: {},
      create: {
        id: 'blog-fitness-routine',
        title: 'Morning Walks Around the Village',
        content:
          "Starting my day with a peaceful walk around our beautiful village paths. The morning light on the mountains is spectacular, and it's a great way to stay active while enjoying nature.",
        excerpt: 'Discover the scenic walking routes in our community',
        category: 'BLOG',
        tags: ['fitness', 'walking', 'nature', 'morning', 'health', 'community'],
        authorId: users[2].id, // Michael Chen
        published: true,
        publishedAt: new Date('2026-02-20'),
      },
    }),
    prisma.content.upsert({
      where: { id: 'blog-book-review' },
      update: {},
      create: {
        id: 'blog-book-review',
        title: 'Book Club Pick: The Old Man and the Sea',
        content:
          'Our February book club selection was Hemingway\'s classic "The Old Man and the Sea". We had a fascinating discussion about perseverance, nature, and the human spirit. Join us next month for our March selection!',
        excerpt: 'Discussion highlights from our latest book club meeting',
        category: 'BLOG',
        tags: ['book-club', 'hemingway', 'literature', 'discussion', 'community', 'reading'],
        authorId: users[3].id, // Emma Williams
        published: true,
        publishedAt: new Date('2026-02-15'),
      },
    }),
    prisma.content.upsert({
      where: { id: 'blog-photography-tips' },
      update: {},
      create: {
        id: 'blog-photography-tips',
        title: 'Photographing the Fynbos in Golden Hour',
        content:
          'The golden hour light transforms our local fynbos vegetation into something magical. Here are my tips for capturing the beauty of our unique ecosystem with your camera.',
        excerpt: 'Capture the magic of our local flora at golden hour',
        category: 'BLOG',
        tags: ['photography', 'fynbos', 'nature', 'golden-hour', 'tips', 'landscape'],
        authorId: users[2].id, // Michael Chen
        published: true,
        publishedAt: new Date('2026-02-05'),
      },
    }),
    prisma.content.upsert({
      where: { id: 'announcement-pool-maintenance' },
      update: {},
      create: {
        id: 'announcement-pool-maintenance',
        title: 'Pool Maintenance Schedule Update',
        content:
          "Due to increased usage this summer, we'll be performing weekly maintenance on the community pool every Tuesday from 8-10 AM. The pool will be closed during this time. We apologize for any inconvenience.",
        excerpt: 'Updated pool maintenance schedule for summer',
        category: 'ANNOUNCEMENT',
        tags: ['pool', 'maintenance', 'schedule', 'summer', 'community', 'facilities'],
        authorId: users[1].id, // Sarah Mitchell
        published: true,
        publishedAt: new Date('2026-03-10'),
      },
    }),
    prisma.content.upsert({
      where: { id: 'blog-yoga-benefits' },
      update: {},
      create: {
        id: 'blog-yoga-benefits',
        title: 'Yoga for Stress Relief and Wellness',
        content:
          'In our busy community life, finding moments of peace is essential. Yoga has been transformative for me - both physically and mentally. Here are some poses I recommend for beginners.',
        excerpt: 'How yoga helps maintain wellness in community living',
        category: 'BLOG',
        tags: ['yoga', 'wellness', 'stress-relief', 'health', 'mindfulness', 'fitness'],
        authorId: users[5].id, // Lisa Chen
        published: true,
        publishedAt: new Date('2026-01-28'),
      },
    }),
    prisma.content.upsert({
      where: { id: 'event-gardening-workshop' },
      update: {},
      create: {
        id: 'event-gardening-workshop',
        title: 'Sustainable Gardening Workshop',
        content:
          'Join us for a hands-on workshop on sustainable gardening practices. Learn about water-wise landscaping, companion planting, and creating wildlife-friendly gardens in our Mediterranean climate.',
        excerpt: 'Learn sustainable gardening techniques for our climate',
        category: 'EVENT',
        tags: ['gardening', 'workshop', 'sustainable', 'water-wise', 'wildlife', 'education'],
        authorId: users[0].id, // John Smith
        published: true,
        publishedAt: new Date('2026-03-05'),
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
