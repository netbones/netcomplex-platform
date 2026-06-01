import {
  PrismaClient,
  Role,
  GroupRole,
  Group,
  UserGroup,
  ContentCategory,
  ResidentType,
  ResidentFilter,
  HouseholdStatus,
  OccupantType,
  ServiceCategory,
  PriceType,
  ListingStatus,
  Priority,
  RequestStatus,
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
    // New HOA member who owns property but doesn't live there
    prisma.user.upsert({
      where: { email: 'robert.wilson@soralia.org' },
      update: {},
      create: {
        email: 'robert.wilson@soralia.org',
        name: 'Robert Wilson',
        role: Role.COMMITTEE, // HOA committee member
        phone: '+27 82 789 0123',
        interests: ['governance', 'finance', 'community'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
        isPublic: true,
      },
    }),
    // Leaseholders living in Robert's unit
    prisma.user.upsert({
      where: { email: 'anna.patel@soralia.org' },
      update: {},
      create: {
        email: 'anna.patel@soralia.org',
        name: 'Anna Patel',
        role: Role.RESIDENT,
        phone: '+27 82 890 1234',
        interests: ['cooking', 'gardening', 'book-club'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna',
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'marcus.johnson@soralia.org' },
      update: {},
      create: {
        email: 'marcus.johnson@soralia.org',
        name: 'Marcus Johnson',
        role: Role.RESIDENT,
        phone: '+27 82 901 2345',
        interests: ['fitness', 'music', 'volunteering'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
        profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
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
    // Content from leaseholders in Robert Wilson's unit
    prisma.content.upsert({
      where: { id: 'blog-cooking-adventures' },
      update: {},
      create: {
        id: 'blog-cooking-adventures',
        title: 'Fusion Cooking: Indian-South African Fusion',
        content:
          'Living in Soralia Village has inspired me to experiment with fusion cooking. Combining traditional Indian spices with local South African ingredients has created some amazing dishes. My latest creation: bobotie with garam masala!',
        excerpt: 'Exploring culinary fusion in our diverse community',
        category: 'BLOG',
        tags: ['cooking', 'fusion', 'indian', 'south-african', 'recipes', 'community'],
        authorId: users[7].id, // Anna Patel (leaseholder)
        published: true,
        publishedAt: new Date('2026-03-08'),
      },
    }),
    prisma.content.upsert({
      where: { id: 'blog-community-music' },
      update: {},
      create: {
        id: 'blog-community-music',
        title: 'Starting a Community Music Group',
        content:
          "As someone who loves music and wants to give back to the community, I'm organizing a casual music jam session. No auditions required - just bring your instrument and passion for music. Let's create some harmony in Soralia Village!",
        excerpt: 'Bringing music lovers together in our community',
        category: 'BLOG',
        tags: ['music', 'community', 'jam-session', 'harmony', 'volunteering', 'social'],
        authorId: users[8].id, // Marcus Johnson (leaseholder)
        published: true,
        publishedAt: new Date('2026-03-12'),
      },
    }),
    prisma.content.upsert({
      where: { id: 'blog-leaseholder-perspective' },
      update: {},
      create: {
        id: 'blog-leaseholder-perspective',
        title: 'Life as a Leaseholder in Soralia Village',
        content:
          'Being a leaseholder in Soralia Village has been an incredible experience. The community is so welcoming, and I love being able to participate in all the activities. The platform makes it easy to connect with neighbors and stay informed about community events.',
        excerpt: "A leaseholder's perspective on community living",
        category: 'BLOG',
        tags: ['leaseholder', 'community', 'experience', 'welcoming', 'participation', 'platform'],
        authorId: users[7].id, // Anna Patel (leaseholder)
        published: true,
        publishedAt: new Date('2026-02-25'),
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

  // Create households with occupants (using only streets from constants)
  const households = await Promise.all([
    // Household 1: John Smith family (Pagoda Rd 12)
    prisma.household.upsert({
      where: { platformAddress: 'unit012@soralia.org' },
      update: {
        homeImage:
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop',
        moveInDate: new Date('2023-01-15'),
      },
      create: {
        street: 'Pagoda Rd',
        unit: '12',
        platformAddress: 'unit012@soralia.org',
        homeImage:
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop',
        status: 'ACTIVE',
        moveInDate: new Date('2023-01-15'),
      },
    }),
    // Household 2: Sarah Mitchell (Wild Almond Rd 8)
    prisma.household.upsert({
      where: { platformAddress: 'unit008@soralia.org' },
      update: {
        homeImage:
          'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=400&fit=crop',
        moveInDate: new Date('2022-08-20'),
      },
      create: {
        street: 'Wild Almond Rd',
        unit: '8',
        platformAddress: 'unit008@soralia.org',
        homeImage:
          'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=400&fit=crop',
        status: 'ACTIVE',
        moveInDate: new Date('2022-08-20'),
      },
    }),
    // Household 3: Michael Chen (Silkypuff Street 3)
    prisma.household.upsert({
      where: { platformAddress: 'unit003@soralia.org' },
      update: {
        homeImage:
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=400&fit=crop',
        moveInDate: new Date('2024-03-10'),
      },
      create: {
        street: 'Silkypuff Street',
        unit: '3',
        platformAddress: 'unit003@soralia.org',
        homeImage:
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=400&fit=crop',
        status: 'ACTIVE',
        moveInDate: new Date('2024-03-10'),
      },
    }),
    // Household 4: Robert Wilson owns but doesn't live in (Conebrush Rd 5)
    prisma.household.upsert({
      where: { platformAddress: 'unit005@soralia.org' },
      update: {
        homeImage:
          'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=400&fit=crop',
        moveInDate: new Date('2020-01-01'),
      },
      create: {
        street: 'Conebrush Rd',
        unit: '5',
        platformAddress: 'unit005@soralia.org',
        homeImage:
          'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=400&fit=crop',
        status: 'ACTIVE',
        moveInDate: new Date('2020-01-01'),
      },
    }),
  ]);

  console.log(`Created ${households.length} households`);

  // Create standard seats (property owners)
  const standardSeats = await Promise.all([
    // John Smith owns Pagoda Rd 12
    prisma.standardSeat.upsert({
      where: { userId_householdId: { userId: users[0].id, householdId: households[0].id } },
      update: {},
      create: {
        userId: users[0].id,
        householdId: households[0].id,
        isPrimaryOwner: true,
        platformAddress: 'john.unit012@soralia.org',
      },
    }),
    // Sarah Mitchell owns Wild Almond Rd 8
    prisma.standardSeat.upsert({
      where: { userId_householdId: { userId: users[1].id, householdId: households[1].id } },
      update: {},
      create: {
        userId: users[1].id,
        householdId: households[1].id,
        isPrimaryOwner: true,
        platformAddress: 'sarah.unit008@soralia.org',
      },
    }),
    // Michael Chen owns Silkypuff Street 3
    prisma.standardSeat.upsert({
      where: { userId_householdId: { userId: users[2].id, householdId: households[2].id } },
      update: {},
      create: {
        userId: users[2].id,
        householdId: households[2].id,
        isPrimaryOwner: true,
        platformAddress: 'michael.unit003@soralia.org',
      },
    }),
    // Robert Wilson owns Conebrush Rd 5 but doesn't live there
    prisma.standardSeat.upsert({
      where: { userId_householdId: { userId: users[6].id, householdId: households[3].id } },
      update: {},
      create: {
        userId: users[6].id, // Robert Wilson
        householdId: households[3].id,
        isPrimaryOwner: true,
        platformAddress: 'robert.unit005@soralia.org',
      },
    }),
    // Sarah Mitchell owns Oak Street 14
    prisma.standardSeat.upsert({
      where: { userId_householdId: { userId: users[1].id, householdId: households[1].id } },
      update: {},
      create: {
        userId: users[1].id,
        householdId: households[1].id,
        isPrimaryOwner: true,
        platformAddress: 'sarah.unit014@soralia.org',
      },
    }),
    // Michael Chen owns Pine Road 7
    prisma.standardSeat.upsert({
      where: { userId_householdId: { userId: users[2].id, householdId: households[2].id } },
      update: {},
      create: {
        userId: users[2].id,
        householdId: households[2].id,
        isPrimaryOwner: true,
        platformAddress: 'michael.unit007@soralia.org',
      },
    }),
    // Robert Wilson owns Cedar Lane 9 but doesn't live there
    prisma.standardSeat.upsert({
      where: { userId_householdId: { userId: users[6].id, householdId: households[3].id } },
      update: {},
      create: {
        userId: users[6].id, // Robert Wilson
        householdId: households[3].id,
        isPrimaryOwner: true,
        platformAddress: 'robert.unit009@soralia.org',
      },
    }),
  ]);

  console.log(`Created ${standardSeats.length} standard seats`);

  // Create address profiles (occupants/family members)
  const profiles = await Promise.all([
    // Emma Williams lives with John Smith (wife)
    prisma.profile.upsert({
      where: { profileAddress: 'emma.unit012@soralia.org' },
      update: {},
      create: {
        householdId: households[0].id,
        displayName: 'Emma Smith',
        profileAddress: 'emma.unit012@soralia.org',
        userId: users[3].id, // Emma has a user account (can create content)
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EmmaSmith',
        isPublic: true,
        occupantSince: new Date('2023-01-15'),
        occupantType: 'OCCUPANT',
      },
    }),
    // Lisa Chen lives with Michael Chen (roommate)
    prisma.profile.upsert({
      where: { profileAddress: 'lisa.unit003@soralia.org' },
      update: {},
      create: {
        householdId: households[2].id,
        displayName: 'Lisa Chen',
        profileAddress: 'lisa.unit003@soralia.org',
        userId: users[5].id, // Lisa has a user account
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LisaChen',
        isPublic: true,
        occupantSince: new Date('2024-03-10'),
        occupantType: 'OCCUPANT',
      },
    }),
    // David's son (minor, no user account)
    prisma.profile.upsert({
      where: { profileAddress: 'alex.unit008@soralia.org' },
      update: {},
      create: {
        householdId: households[1].id,
        displayName: 'Alex Mitchell',
        profileAddress: 'alex.unit008@soralia.org',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexMitchell',
        isPublic: true,
        occupantSince: new Date('2022-08-20'),
        occupantType: 'MINOR',
      },
    }),
    // John's daughter (teen, no user account yet)
    prisma.profile.upsert({
      where: { profileAddress: 'sophia.unit012@soralia.org' },
      update: {},
      create: {
        householdId: households[0].id,
        displayName: 'Sophia Smith',
        profileAddress: 'sophia.unit012@soralia.org',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SophiaSmith',
        isPublic: true,
        occupantSince: new Date('2023-01-15'),
        occupantType: 'MINOR',
      },
    }),
    // Leaseholders in Robert Wilson's unit (Conebrush Rd 5)
    prisma.profile.upsert({
      where: { profileAddress: 'anna.unit005@soralia.org' },
      update: {},
      create: {
        householdId: households[3].id,
        displayName: 'Anna Patel',
        profileAddress: 'anna.unit005@soralia.org',
        userId: users[7].id, // Anna has a user account (leaseholder)
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AnnaPatel',
        isPublic: true,
        occupantSince: new Date('2025-06-01'),
        occupantType: 'OCCUPANT',
      },
    }),
    prisma.profile.upsert({
      where: { profileAddress: 'marcus.unit005@soralia.org' },
      update: {},
      create: {
        householdId: households[3].id,
        displayName: 'Marcus Johnson',
        profileAddress: 'marcus.unit005@soralia.org',
        userId: users[8].id, // Marcus has a user account (leaseholder)
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusJohnson',
        isPublic: true,
        occupantSince: new Date('2025-09-15'),
        occupantType: 'OCCUPANT',
      },
    }),
  ]);

  console.log(`Created ${profiles.length} address profiles`);

  // Seed Community Services Marketplace
  console.log('Seeding community services...');

  // Get existing users for service providers
  const serviceProviders = await Promise.all([
    prisma.user.upsert({
      where: { email: 'gardener.mike@soralia.org' },
      update: {},
      create: {
        email: 'gardener.mike@soralia.org',
        name: 'Mike Johnson',
        role: Role.RESIDENT,
        phone: '+27 82 345 6789',
        interests: ['gardening', 'landscaping'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'plumber.susan@soralia.org' },
      update: {},
      create: {
        email: 'plumber.susan@soralia.org',
        name: 'Susan van der Merwe',
        role: Role.RESIDENT,
        phone: '+27 82 456 7890',
        interests: ['home-improvement', 'diy'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Susan',
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'electrician.peter@soralia.org' },
      update: {},
      create: {
        email: 'electrician.peter@soralia.org',
        name: 'Peter Nkosi',
        role: Role.RESIDENT,
        phone: '+27 82 567 8901',
        interests: ['electronics', 'home-improvement'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Peter',
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'cleaner.linda@soralia.org' },
      update: {},
      create: {
        email: 'cleaner.linda@soralia.org',
        name: 'Linda Fourie',
        role: Role.RESIDENT,
        phone: '+27 82 678 9012',
        interests: ['cleaning', 'organization'],
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Linda',
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'hoa.services@soralia.org' },
      update: {},
      create: {
        email: 'hoa.services@soralia.org',
        name: 'Soralia HOA Services',
        role: Role.ADMIN,
        phone: '+27 21 123 4567',
        interests: ['community', 'maintenance'],
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=SHS',
        isPublic: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'trusted.plumbing@soralia.org' },
      update: {},
      create: {
        email: 'trusted.plumbing@soralia.org',
        name: 'Cape Plumbing Solutions',
        role: Role.AGENT,
        phone: '+27 21 987 6543',
        interests: ['plumbing', 'emergency-services'],
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=CPS',
        isPublic: true,
      },
    }),
  ]);

  // Seed Community Service Listings
  const serviceListings = await Promise.all([
    // Gardening Services (Member)
    prisma.communityServiceListing.create({
      data: {
        providerId: serviceProviders[0].id, // Mike Johnson
        title: 'Garden Maintenance & Landscaping',
        description:
          'Professional garden maintenance including lawn mowing, trimming, weeding, and seasonal planting. 15 years experience in Cape Town gardens. References available.',
        category: ServiceCategory.GARDENING,
        priceType: PriceType.HOURLY,
        price: 180,
        serviceAreas: ['Soralia Village', 'Muizenberg', 'St James'],
        availability: { weekdays: true, weekends: true, evenings: false },
        images: [
          'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
          'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400',
        ],
        verified: true,
        rating: 4.8,
        reviewCount: 12,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        termsAndConditions:
          'Payment due within 7 days. Materials extra. 24hr cancellation notice required.',
        cancellationPolicy:
          'Free cancellation up to 24 hours before service. 50% charge for same-day cancellation.',
      },
    }),

    // Plumbing Services (Trusted Third Party)
    prisma.communityServiceListing.create({
      data: {
        providerId: serviceProviders[5].id, // Cape Plumbing Solutions
        title: 'Emergency & Residential Plumbing',
        description:
          'Licensed plumbing services for all residential needs. 24/7 emergency callouts available. Fully insured with 5-year workmanship guarantee.',
        category: ServiceCategory.PLUMBING,
        priceType: PriceType.HOURLY,
        price: 350,
        serviceAreas: ['Soralia Village', 'Muizenberg', 'Cape Town Southern Suburbs'],
        availability: { emergency: true, weekdays: true, weekends: true, evenings: true },
        licenseNumber: 'PL-2023-0456',
        insuranceExpiry: new Date('2027-12-31'),
        images: [
          'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        ],
        verified: true,
        rating: 4.9,
        reviewCount: 28,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        termsAndConditions:
          'Quote provided before work begins. Materials charged at cost plus 15%. All work guaranteed.',
        cancellationPolicy:
          'Emergency calls: 2hr cancellation notice. Scheduled work: 24hr notice required.',
      },
    }),

    // Electrical Services (Member)
    prisma.communityServiceListing.create({
      data: {
        providerId: serviceProviders[2].id, // Peter Nkosi
        title: 'Residential Electrical Repairs',
        description:
          'Qualified electrician specializing in residential electrical work. COC certificates available. Safe, reliable service with competitive rates.',
        category: ServiceCategory.ELECTRICAL,
        priceType: PriceType.HOURLY,
        price: 280,
        serviceAreas: ['Soralia Village', 'Muizenberg'],
        availability: { weekdays: true, weekends: false, evenings: false },
        licenseNumber: 'ELE-2022-0789',
        insuranceExpiry: new Date('2026-08-15'),
        images: [
          'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400',
          'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
        ],
        verified: true,
        rating: 4.7,
        reviewCount: 8,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        termsAndConditions:
          'All work complies with SANS 10142. COC certificates provided. 6-month workmanship guarantee.',
        cancellationPolicy:
          '24hr notice required for cancellation. Emergency work cannot be cancelled.',
      },
    }),

    // Cleaning Services (Member)
    prisma.communityServiceListing.create({
      data: {
        providerId: serviceProviders[3].id, // Linda Fourie
        title: 'Deep Cleaning & Housekeeping',
        description:
          'Thorough cleaning services for homes and apartments. Eco-friendly products used. Regular and one-time cleans available.',
        category: ServiceCategory.CLEANING,
        priceType: PriceType.HOURLY,
        price: 120,
        serviceAreas: ['Soralia Village', 'Muizenberg', 'St James'],
        availability: { weekdays: true, weekends: true, evenings: false },
        images: [
          'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
          'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=400',
        ],
        verified: false,
        rating: 4.5,
        reviewCount: 15,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        termsAndConditions:
          'Eco-friendly products only. Keys handled securely. Satisfaction guarantee.',
        cancellationPolicy: '48hr notice required. Late cancellations may incur 50% charge.',
      },
    }),

    // HOA Community Services (Community)
    prisma.communityServiceListing.create({
      data: {
        providerId: serviceProviders[4].id, // Soralia HOA Services
        title: 'HOA Community Maintenance Services',
        description:
          'Official HOA maintenance services including pool cleaning, common area upkeep, and emergency repairs. Services provided by certified HOA contractors.',
        category: ServiceCategory.MAINTENANCE,
        priceType: PriceType.FREE,
        serviceAreas: ['Soralia Village'],
        availability: { weekdays: true, weekends: false, evenings: false },
        images: [
          'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400',
          'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400',
        ],
        verified: true,
        rating: 4.2,
        reviewCount: 45,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        termsAndConditions:
          'Services provided as part of HOA membership. Emergency services prioritized.',
        cancellationPolicy: 'Non-emergency services require 48hr notice.',
      },
    }),

    // Appliance Repair (Member - Draft)
    prisma.communityServiceListing.create({
      data: {
        providerId: serviceProviders[0].id, // Mike Johnson (also does appliances)
        title: 'Appliance Repair Services',
        description:
          'Repair and maintenance of household appliances including washing machines, dishwashers, ovens, and refrigerators.',
        category: ServiceCategory.APPLIANCE_REPAIR,
        priceType: PriceType.QUOTE,
        serviceAreas: ['Soralia Village', 'Muizenberg'],
        availability: { weekdays: true, weekends: true, evenings: false },
        images: ['https://images.unsplash.com/photo-1621905252478-2f1d6c0a6b2f?w=400'],
        verified: false,
        rating: 0,
        reviewCount: 0,
        status: ListingStatus.DRAFT,
        isPublished: false,
        termsAndConditions: 'Parts charged at cost plus 20%. 3-month workmanship guarantee.',
        cancellationPolicy: 'Callout fee applies for no-show appointments.',
      },
    }),

    // Pest Control (Trusted Third Party)
    prisma.communityServiceListing.create({
      data: {
        providerId: serviceProviders[5].id, // Cape Plumbing (also does pest control)
        title: 'Pest Control & Prevention',
        description:
          'Professional pest control services using environmentally friendly methods. Ants, cockroaches, rodents, and other common pests.',
        category: ServiceCategory.PEST_CONTROL,
        priceType: PriceType.FIXED,
        price: 850,
        serviceAreas: ['Soralia Village', 'Muizenberg', 'St James'],
        availability: { weekdays: true, weekends: false, evenings: false },
        licenseNumber: 'PEST-2024-0123',
        insuranceExpiry: new Date('2026-06-30'),
        images: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400'],
        verified: true,
        rating: 4.6,
        reviewCount: 9,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        termsAndConditions:
          'Eco-friendly treatments only. 90-day guarantee. Follow-up inspections included.',
        cancellationPolicy: '24hr notice required. Late cancellations charged at 50%.',
      },
    }),

    // Security Services (Community)
    prisma.communityServiceListing.create({
      data: {
        providerId: serviceProviders[4].id, // Soralia HOA Services
        title: 'Security System Installation & Maintenance',
        description:
          'HOA-approved security services including alarm systems, CCTV installation, and access control systems. Competitive rates for community members.',
        category: ServiceCategory.SECURITY,
        priceType: PriceType.QUOTE,
        serviceAreas: ['Soralia Village'],
        availability: { weekdays: true, weekends: false, evenings: false },
        images: [
          'https://images.unsplash.com/photo-1558002038-1055907df827?w=400',
          'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400',
        ],
        verified: true,
        rating: 4.4,
        reviewCount: 7,
        status: ListingStatus.ACTIVE,
        isPublished: true,
        termsAndConditions:
          'HOA-approved equipment only. Professional installation guaranteed. 2-year warranty.',
        cancellationPolicy: 'Standard cancellation terms apply. Deposit may be non-refundable.',
      },
    }),
  ]);

  console.log(`Created ${serviceListings.length} community service listings`);

  // Seed some sample reviews
  const reviews = await Promise.all([
    prisma.communityServiceReview.create({
      data: {
        listingId: serviceListings[0].id, // Gardening
        reviewerId: users[0].id, // John Smith
        rating: 5,
        title: 'Excellent service!',
        comment:
          'Mike did a fantastic job on our garden. Very professional and the results are amazing. Highly recommended!',
        serviceDate: new Date('2026-03-15'),
        responseQuality: 5,
        isPublished: true,
      },
    }),
    prisma.communityServiceReview.create({
      data: {
        listingId: serviceListings[1].id, // Plumbing
        reviewerId: users[1].id, // Sarah Mitchell
        rating: 5,
        title: 'Emergency plumbing heroes!',
        comment:
          'Called them at 2am for a burst pipe. They arrived within an hour and fixed everything perfectly. Lifesavers!',
        serviceDate: new Date('2026-03-20'),
        responseQuality: 5,
        isPublished: true,
      },
    }),
    prisma.communityServiceReview.create({
      data: {
        listingId: serviceListings[2].id, // Electrical
        rating: 4,
        reviewerId: users[2].id, // Michael Chen
        title: 'Good work, fair price',
        comment:
          'Peter replaced our faulty outlets. Work was done well and he explained everything clearly. Would use again.',
        serviceDate: new Date('2026-03-10'),
        responseQuality: 4,
        isPublished: true,
      },
    }),
    prisma.communityServiceReview.create({
      data: {
        listingId: serviceListings[3].id, // Cleaning
        reviewerId: users[0].id, // John Smith
        rating: 5,
        title: 'Spotless results!',
        comment:
          'Linda did a deep clean of our home before we put it on the market. Absolutely spotless and very thorough.',
        serviceDate: new Date('2026-03-05'),
        responseQuality: 5,
        isPublished: true,
      },
    }),
  ]);

  console.log(`Created ${reviews.length} sample reviews`);

  // ═══════════════════════════════════════════════════════════════
  // MAINTENANCE CATEGORIES
  // ═══════════════════════════════════════════════════════════════

  const maintenanceCategories = await Promise.all([
    prisma.maintenanceCategory.upsert({
      where: { id: 'cat-plumbing' },
      update: {},
      create: {
        id: 'cat-plumbing',
        tenantId: 'soralia',
        value: 'PLUMBING',
        label: 'Plumbing',
        description: 'Water supply, drainage, and pipe systems',
        isActive: true,
      },
    }),
    prisma.maintenanceCategory.upsert({
      where: { id: 'cat-electrical' },
      update: {},
      create: {
        id: 'cat-electrical',
        tenantId: 'soralia',
        value: 'ELECTRICAL',
        label: 'Electrical',
        description: 'Power supply, wiring, and electrical fixtures',
        isActive: true,
      },
    }),
    prisma.maintenanceCategory.upsert({
      where: { id: 'cat-hvac' },
      update: {},
      create: {
        id: 'cat-hvac',
        tenantId: 'soralia',
        value: 'HVAC',
        label: 'HVAC',
        description: 'Heating, ventilation, and air conditioning',
        isActive: true,
      },
    }),
    prisma.maintenanceCategory.upsert({
      where: { id: 'cat-landscaping' },
      update: {},
      create: {
        id: 'cat-landscaping',
        tenantId: 'soralia',
        value: 'LANDSCAPING',
        label: 'Landscaping',
        description: 'Gardens, irrigation, trees, and outdoor areas',
        isActive: true,
      },
    }),
    prisma.maintenanceCategory.upsert({
      where: { id: 'cat-structural' },
      update: {},
      create: {
        id: 'cat-structural',
        tenantId: 'soralia',
        value: 'STRUCTURAL',
        label: 'Structural',
        description: 'Building structure, walls, doors, windows',
        isActive: true,
      },
    }),
    prisma.maintenanceCategory.upsert({
      where: { id: 'cat-network' },
      update: {},
      create: {
        id: 'cat-network',
        tenantId: 'soralia',
        value: 'NETWORK',
        label: 'Network',
        description: 'Internet, fibre, and network infrastructure',
        isActive: true,
      },
    }),
    prisma.maintenanceCategory.upsert({
      where: { id: 'cat-waste' },
      update: {},
      create: {
        id: 'cat-waste',
        tenantId: 'soralia',
        value: 'WASTE',
        label: 'Waste Management',
        description: 'Rubbish removal, recycling, and bulk waste',
        isActive: true,
      },
    }),
    prisma.maintenanceCategory.upsert({
      where: { id: 'cat-security' },
      update: {},
      create: {
        id: 'cat-security',
        tenantId: 'soralia',
        value: 'SECURITY',
        label: 'Security',
        description: 'Alarm systems, CCTV, and access control',
        isActive: true,
      },
    }),
    prisma.maintenanceCategory.upsert({
      where: { id: 'cat-other' },
      update: {},
      create: {
        id: 'cat-other',
        tenantId: 'soralia',
        value: 'OTHER',
        label: 'Other',
        description: "Requests that don't fit other categories",
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${maintenanceCategories.length} maintenance categories`);

  // ═══════════════════════════════════════════════════════════════
  // MAINTENANCE TEAMS
  // ═══════════════════════════════════════════════════════════════

  const maintenanceTeams = await Promise.all([
    prisma.maintenanceTeam.upsert({
      where: { id: 'team-plumbing' },
      update: {},
      create: {
        id: 'team-plumbing',
        tenantId: 'soralia',
        name: 'Plumbing Team',
        trade: 'PLUMBING',
        contactName: 'Thabo Mokoena',
        isActive: true,
      },
    }),
    prisma.maintenanceTeam.upsert({
      where: { id: 'team-electrical' },
      update: {},
      create: {
        id: 'team-electrical',
        tenantId: 'soralia',
        name: 'Electrical Team',
        trade: 'ELECTRICAL',
        contactName: 'Sarah van der Merwe',
        isActive: true,
      },
    }),
    prisma.maintenanceTeam.upsert({
      where: { id: 'team-landscaping' },
      update: {},
      create: {
        id: 'team-landscaping',
        tenantId: 'soralia',
        name: 'Landscaping Team',
        trade: 'LANDSCAPING',
        contactName: 'David Nkosi',
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${maintenanceTeams.length} maintenance teams`);

  // ═══════════════════════════════════════════════════════════════
  // SERVICE PROVIDERS
  // ═══════════════════════════════════════════════════════════════

  const serviceProviders = await Promise.all([
    prisma.serviceProvider.upsert({
      where: { id: 'prov-pipe-burst' },
      update: {},
      create: {
        id: 'prov-pipe-burst',
        tenantId: 'soralia',
        companyName: 'PipeBurst Solutions Inc.',
        trade: 'PLUMBING',
        phone: '+27 82 555 0101',
        isActive: true,
      },
    }),
    prisma.serviceProvider.upsert({
      where: { id: 'prov-tree-felling' },
      update: {},
      create: {
        id: 'prov-tree-felling',
        tenantId: 'soralia',
        companyName: 'TreeCare Pros',
        trade: 'LANDSCAPING',
        phone: '+27 82 555 0102',
        isActive: true,
      },
    }),
    prisma.serviceProvider.upsert({
      where: { id: 'prov-electrical' },
      update: {},
      create: {
        id: 'prov-electrical',
        tenantId: 'soralia',
        companyName: 'VoltSafe Electrical',
        trade: 'ELECTRICAL',
        phone: '+27 82 555 0103',
        isActive: true,
      },
    }),
    prisma.serviceProvider.upsert({
      where: { id: 'prov-network' },
      update: {},
      create: {
        id: 'prov-network',
        tenantId: 'soralia',
        companyName: 'FibreConnect ISP',
        trade: 'NETWORK',
        phone: '+27 82 555 0104',
        isActive: true,
      },
    }),
    prisma.serviceProvider.upsert({
      where: { id: 'prov-waste' },
      update: {},
      create: {
        id: 'prov-waste',
        tenantId: 'soralia',
        companyName: 'WasteWise Collectors',
        trade: 'WASTE',
        phone: '+27 82 555 0105',
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${serviceProviders.length} service providers`);

  // ═══════════════════════════════════════════════════════════════
  // MAINTENANCE REQUESTS (7 seed entries)
  // ═══════════════════════════════════════════════════════════════

  const now = new Date();
  const residentUserIds = users.filter(u => u.role === Role.RESIDENT).map(u => u.id);

  const maintenanceRequests = await Promise.all([
    // 1. Lawn irrigation malfunction — SUBMITTED
    prisma.maintenanceRequest.upsert({
      where: { id: 'mr-irrigation-01' },
      update: {},
      create: {
        id: 'mr-irrigation-01',
        tenantId: 'soralia',
        userId: residentUserIds[0] || users[0].id,
        category: 'LANDSCAPING',
        priority: Priority.MEDIUM,
        status: RequestStatus.SUBMITTED,
        ticketNumber: 'SRV-2026-0001',
        description:
          "The automated sprinkler system in the common garden area has been malfunctioning for the past week. Zones 3 and 4 aren't turning on, and zone 2 runs continuously.",
        images: [],
        createdAt: new Date(now.getTime() - 3 * 86400000),
        updatedAt: new Date(now.getTime() - 3 * 86400000),
      },
    }),

    // 2. Burst pipe in unit 12B — IN_PROGRESS (assigned to Plumbing Team)
    prisma.maintenanceRequest.upsert({
      where: { id: 'mr-burst-pipe' },
      update: {},
      create: {
        id: 'mr-burst-pipe',
        tenantId: 'soralia',
        userId: residentUserIds[1] || users[1].id,
        category: 'PLUMBING',
        priority: Priority.EMERGENCY,
        status: RequestStatus.IN_PROGRESS,
        ticketNumber: 'SRV-2026-0002',
        assignedTeamId: 'team-plumbing',
        description:
          'Water pipe burst in the kitchen wall. Water damage spreading to ground floor. Need immediate shutdown of water supply to building B.',
        images: [],
        createdAt: new Date(now.getTime() - 12 * 3600000),
        updatedAt: new Date(now.getTime() - 2 * 3600000),
      },
    }),

    // 3. Tree felling request — SUBMITTED
    prisma.maintenanceRequest.upsert({
      where: { id: 'mr-tree-felling' },
      update: {},
      create: {
        id: 'mr-tree-felling',
        tenantId: 'soralia',
        userId: residentUserIds[2] || users[2].id,
        category: 'LANDSCAPING',
        priority: Priority.HIGH,
        status: RequestStatus.SUBMITTED,
        ticketNumber: 'SRV-2026-0003',
        description:
          "The old oak tree near the children's playground has a large dead branch hanging over the play area. Risk of it falling during the next storm.",
        images: [],
        createdAt: new Date(now.getTime() - 1 * 86400000),
        updatedAt: new Date(now.getTime() - 1 * 86400000),
      },
    }),

    // 4. Network outage — IN_PROGRESS (assigned to FibreConnect ISP)
    prisma.maintenanceRequest.upsert({
      where: { id: 'mr-network-outage' },
      update: {},
      create: {
        id: 'mr-network-outage',
        tenantId: 'soralia',
        userId: residentUserIds[0] || users[0].id,
        category: 'NETWORK',
        priority: Priority.HIGH,
        status: RequestStatus.IN_PROGRESS,
        ticketNumber: 'SRV-2026-0004',
        assignedProviderId: 'prov-network',
        description:
          'Fiber optic cable cut by contractors during roadworks on the main access road. All units in Blocks A and B have no internet connectivity since yesterday. FibreConnect has been notified.',
        images: [],
        createdAt: new Date(now.getTime() - 2 * 86400000),
        updatedAt: new Date(now.getTime() - 6 * 3600000),
      },
    }),

    // 5. Electrical mains problem — ASSIGNED (to Electrical Team)
    prisma.maintenanceRequest.upsert({
      where: { id: 'mr-electrical-mains' },
      update: {},
      create: {
        id: 'mr-electrical-mains',
        tenantId: 'soralia',
        userId: residentUserIds[3] || users[3].id,
        category: 'ELECTRICAL',
        priority: Priority.HIGH,
        status: RequestStatus.ASSIGNED,
        ticketNumber: 'SRV-2026-0005',
        assignedTeamId: 'team-electrical',
        description:
          'Flickering lights and intermittent power surges in Block C units 20-30. Affects all rooms. Neighbors in adjacent units report similar issues. Seems to be related to the main supply line.',
        images: [],
        createdAt: new Date(now.getTime() - 4 * 86400000),
        updatedAt: new Date(now.getTime() - 1 * 86400000),
      },
    }),

    // 6. Bin removal request — CANCELLED
    prisma.maintenanceRequest.upsert({
      where: { id: 'mr-bin-removal' },
      update: {},
      create: {
        id: 'mr-bin-removal',
        tenantId: 'soralia',
        userId: residentUserIds[1] || users[1].id,
        category: 'WASTE',
        priority: Priority.LOW,
        status: RequestStatus.CANCELLED,
        ticketNumber: 'SRV-2026-0006',
        description:
          "Requesting removal of bulky waste (old furniture, mattresses) from unit 8. Normal bin collection can't handle these items.",
        images: [],
        createdAt: new Date(now.getTime() - 14 * 86400000),
        updatedAt: new Date(now.getTime() - 12 * 86400000),
      },
    }),

    // 7. Garage door stuck (longstanding) — SUBMITTED
    prisma.maintenanceRequest.upsert({
      where: { id: 'mr-garage-door' },
      update: {},
      create: {
        id: 'mr-garage-door',
        tenantId: 'soralia',
        userId: residentUserIds[2] || users[2].id,
        category: 'STRUCTURAL',
        priority: Priority.LOW,
        status: RequestStatus.SUBMITTED,
        ticketNumber: 'SRV-2026-0007',
        description:
          'The garage door at unit 17B has been sticking intermittently for the past 3 months. It makes a loud grinding noise when opening and sometimes gets stuck halfway. Have reported twice before but issue persists.',
        images: [],
        createdAt: new Date(now.getTime() - 90 * 86400000),
        updatedAt: new Date(now.getTime() - 5 * 86400000),
      },
    }),
  ]);

  console.log(`Created ${maintenanceRequests.length} maintenance requests`);

  // ═══════════════════════════════════════════════════════════════
  // TICKET NUMBER FORMAT SETTING
  // ═══════════════════════════════════════════════════════════════

  await prisma.setting.upsert({
    where: { id: 'setting-ticket-format' },
    update: {},
    create: {
      id: 'setting-ticket-format',
      tenantId: 'soralia',
      key: 'ticket_number_format',
      value: 'SRV-{YYYY}-{NNNN}',
    },
  });

  console.log('Created ticket_number_format setting');

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
