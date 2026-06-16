/**
 * Solaris Heights — seed data.
 *
 * A high-rise condominium complex in the Cape Flats, 3 blocks of 10 storeys
 * each. Max capacity 150 units (10 floors × 5 units per floor × 3 blocks).
 * The seed file only creates representative demo data — see
 * `soralia-village.ts` for the more comprehensive reference shape.
 *
 * Distinctive features versus Soralia Village:
 *   - Body corporate governance (not HOA)
 *   - Building systems (lifts, generators, fire safety) drive maintenance
 *   - Common-area facilities: pool, gym, function room
 *   - Stricter pet/noise policies because of shared walls
 *   - Slug `solaris-heights` is namespaced to avoid ID collisions
 *
 * See `soralia-village.ts` for the canonical Soralia data set that this
 * template follows.
 */

import type { TenantSeedData } from './types';

export const SOLARIS_HEIGHTS: TenantSeedData = {
  tenant: {
    name: 'Solaris Heights',
    slug: 'solaris-heights',
    primaryColor: '#0EA5E9',
    accentColor: '#F97316',
    subscriptionTier: 'depth',
    tier: 'STANDARD',
    featureFlags: { whiteLabel: true },
    tagline: 'Modern city living, community at heart',
    description:
      'A 3-block high-rise condominium of up to 150 units in the Cape Flats, with shared amenities and a body corporate that keeps things running smoothly.',
    ticketPrefix: 'SLH',
  },

  // -------------------------------------------------------------------------
  // People
  // -------------------------------------------------------------------------
  users: [
    {
      id: 'user-thandi-mokoena',
      email: 'thandi.mokoena@example.com',
      name: 'Thandi Mokoena',
      role: 'BOARD',
      phone: '+27 71 234 5678',
      interests: ['governance', 'community-building', 'urban-gardening'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thandi',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thandi',
      books: [
        {
          id: 'slh-book-1',
          title: 'The Body Corporate Handbook',
          author: 'CSOS',
          coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
        },
        {
          id: 'slh-book-2',
          title: 'The Power of Now',
          author: 'Eckhart Tolle',
          coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
        },
      ],
    },
    {
      id: 'user-johan-botha',
      email: 'johan.botha@example.com',
      name: 'Johan Botha',
      role: 'ADMIN',
      phone: '+27 71 345 6789',
      interests: ['building-management', 'safety', 'fire-compliance'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Johan',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Johan',
      books: [
        {
          id: 'slh-book-3',
          title: 'SANS 10400 Explained',
          author: 'NRCS Press',
          coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
        },
      ],
    },
    {
      id: 'user-lerato-khumalo',
      email: 'lerato.khumalo@example.com',
      name: 'Lerato Khumalo',
      role: 'RESIDENT',
      phone: '+27 71 456 7890',
      interests: ['yoga', 'meditation', 'reading'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lerato',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lerato',
      books: [
        {
          id: 'slh-book-4',
          title: 'Sapiens',
          author: 'Yuval Noah Harari',
          coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
        },
        {
          id: 'slh-book-5',
          title: 'Atomic Habits',
          author: 'James Clear',
          coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
        },
      ],
    },
    {
      id: 'user-amir-hassan',
      email: 'amir.hassan@example.com',
      name: 'Amir Hassan',
      role: 'RESIDENT',
      phone: '+27 71 567 8901',
      interests: ['fitness', 'running', 'cycling'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amir',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amir',
      books: [],
    },
    {
      id: 'user-zanele-dlamini',
      email: 'zanele.dlamini@example.com',
      name: 'Zanele Dlamini',
      role: 'RESIDENT',
      phone: '+27 71 678 9012',
      interests: ['cooking', 'food-blogging'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zanele',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zanele',
      books: [
        {
          id: 'slh-book-6',
          title: "My Mother's Kitchen",
          author: 'Mpho Tshabalala',
          coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400',
        },
      ],
    },
    {
      id: 'user-pieter-steyn',
      email: 'pieter.steyn@example.com',
      name: 'Pieter Steyn',
      role: 'COMMITTEE',
      phone: '+27 71 789 0123',
      interests: ['finance', 'audit', 'governance'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pieter',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pieter',
      books: [
        {
          id: 'slh-book-7',
          title: 'King IV Report on Corporate Governance',
          author: 'IoDSA',
          coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400',
        },
      ],
    },
    {
      id: 'user-fatima-adams',
      email: 'fatima.adams@example.com',
      name: 'Fatima Adams',
      role: 'RESIDENT',
      phone: '+27 71 890 1234',
      interests: ['art', 'photography', 'interior-design'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FatimaA',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FatimaA',
      books: [],
    },
    {
      id: 'user-gregory-naidoo',
      email: 'gregory.naidoo@example.com',
      name: 'Gregory Naidoo',
      role: 'RESIDENT',
      phone: '+27 71 901 2345',
      interests: ['gaming', 'tech', 'movies'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gregory',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gregory',
      books: [],
    },
    {
      id: 'user-naledi-zulu',
      email: 'naledi.zulu@example.com',
      name: 'Naledi Zulu',
      role: 'RESIDENT',
      phone: '+27 71 012 3456',
      interests: ['parenting', 'cooking', 'music'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naledi',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naledi',
      books: [],
    },
    {
      id: 'user-rashid-patel',
      email: 'rashid.patel@example.com',
      name: 'Rashid Patel',
      role: 'RESIDENT',
      phone: '+27 71 111 2222',
      interests: ['cricket', 'photography'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rashid',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rashid',
      books: [],
    },
    {
      id: 'user-tarryn-lewis',
      email: 'tarryn.lewis@example.com',
      name: 'Tarryn Lewis',
      role: 'RESIDENT',
      phone: '+27 71 222 3333',
      interests: ['wine', 'cooking', 'book-club'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tarryn',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tarryn',
      books: [
        {
          id: 'slh-book-8',
          title: 'The Wine Farm',
          author: 'Sarah Penny',
          coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
        },
      ],
    },
    {
      id: 'user-sipho-mthembu',
      email: 'sipho.mthembu@example.com',
      name: 'Sipho Mthembu',
      role: 'RESIDENT',
      phone: '+27 71 333 4444',
      interests: ['football', 'mentoring'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sipho',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sipho',
      books: [],
    },
    // Service provider users
    {
      id: 'user-slh-mike-electric',
      email: 'mike.electric@example.com',
      name: 'Mike Electric (SLH)',
      role: 'RESIDENT',
      phone: '+27 71 444 5555',
      interests: ['electrical', 'lift-maintenance'],
    },
    {
      id: 'user-slh-lift-tech',
      email: 'capelift.services@example.com',
      name: 'Cape Lift Services',
      role: 'AGENT',
      phone: '+27 21 555 0100',
      interests: ['lifts', 'elevator-maintenance', 'compliance'],
    },
    {
      id: 'user-slh-garden-svc',
      email: 'urban.garden.svc@example.com',
      name: 'Urban Garden Services',
      role: 'RESIDENT',
      phone: '+27 71 555 6666',
      interests: ['urban-gardening', 'landscaping'],
    },
    {
      id: 'user-slh-cleaning',
      email: 'shine.cleaning@example.com',
      name: 'Shine Building Cleaners',
      role: 'AGENT',
      phone: '+27 21 555 0200',
      interests: ['cleaning', 'common-areas'],
    },
    // Solo seat user — family member living with Thandi
    {
      id: 'user-slh-buhle',
      email: 'buhle.mokoena@example.com',
      name: 'Buhle Mokoena',
      role: 'RESIDENT',
      phone: '+27 71 666 7777',
      interests: ['music', 'student-life'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Buhle',
      profileImage: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Buhle',
    },
  ],

  // 12 demo units (representing 150 max). 3 blocks × 4 floors shown.
  properties: [
    {
      id: 'prop-a-101',
      platformAddress: 'a101@solarisheights.org',
      street: 'Block A',
      unit: '101',
      ownerId: 'user-thandi-mokoena',
      homeImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    },
    {
      id: 'prop-a-201',
      platformAddress: 'a201@solarisheights.org',
      street: 'Block A',
      unit: '201',
      ownerId: 'user-lerato-khumalo',
      homeImage: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    },
    {
      id: 'prop-a-301',
      platformAddress: 'a301@solarisheights.org',
      street: 'Block A',
      unit: '301',
      ownerId: 'user-amir-hassan',
      homeImage: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    },
    {
      id: 'prop-a-401',
      platformAddress: 'a401@solarisheights.org',
      street: 'Block A',
      unit: '401',
      ownerId: 'user-zanele-dlamini',
      homeImage: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80',
    },
    {
      id: 'prop-b-101',
      platformAddress: 'b101@solarisheights.org',
      street: 'Block B',
      unit: '101',
      ownerId: 'user-pieter-steyn',
      homeImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    },
    {
      id: 'prop-b-201',
      platformAddress: 'b201@solarisheights.org',
      street: 'Block B',
      unit: '201',
      ownerId: 'user-fatima-adams',
      homeImage: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
    },
    {
      id: 'prop-b-301',
      platformAddress: 'b301@solarisheights.org',
      street: 'Block B',
      unit: '301',
      ownerId: 'user-gregory-naidoo',
      homeImage: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
    },
    {
      id: 'prop-b-401',
      platformAddress: 'b401@solarisheights.org',
      street: 'Block B',
      unit: '401',
      ownerId: 'user-naledi-zulu',
      homeImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    },
    {
      id: 'prop-c-101',
      platformAddress: 'c101@solarisheights.org',
      street: 'Block C',
      unit: '101',
      ownerId: 'user-rashid-patel',
      homeImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    },
    {
      id: 'prop-c-201',
      platformAddress: 'c201@solarisheights.org',
      street: 'Block C',
      unit: '201',
      ownerId: 'user-tarryn-lewis',
      homeImage: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    },
    {
      id: 'prop-c-301',
      platformAddress: 'c301@solarisheights.org',
      street: 'Block C',
      unit: '301',
      ownerId: 'user-sipho-mthembu',
      homeImage: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
    },
    {
      id: 'prop-c-401',
      platformAddress: 'c401@solarisheights.org',
      street: 'Block C',
      unit: '401',
      ownerId: 'user-thandi-mokoena',
      homeImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80',
    },
  ],

  households: [
    {
      id: 'hh-a101',
      propertyId: 'prop-a-101',
      occupancyType: 'OWNER_OCCUPIED',
      moveInDate: new Date('2022-03-01'),
    },
    {
      id: 'hh-a201',
      propertyId: 'prop-a-201',
      occupancyType: 'OWNER_OCCUPIED',
      moveInDate: new Date('2023-07-15'),
    },
    {
      id: 'hh-a301',
      propertyId: 'prop-a-301',
      occupancyType: 'OWNER_OCCUPIED',
      moveInDate: new Date('2024-01-10'),
    },
    {
      id: 'hh-a401',
      propertyId: 'prop-a-401',
      occupancyType: 'RENTAL',
      moveInDate: new Date('2025-09-01'),
    },
    {
      id: 'hh-b101',
      propertyId: 'prop-b-101',
      occupancyType: 'OWNER_OCCUPIED',
      moveInDate: new Date('2021-11-20'),
    },
    {
      id: 'hh-b201',
      propertyId: 'prop-b-201',
      occupancyType: 'OWNER_OCCUPIED',
      moveInDate: new Date('2024-04-05'),
    },
    {
      id: 'hh-b301',
      propertyId: 'prop-b-301',
      occupancyType: 'RENTAL',
      moveInDate: new Date('2025-02-12'),
    },
    {
      id: 'hh-b401',
      propertyId: 'prop-b-401',
      occupancyType: 'OWNER_OCCUPIED',
      moveInDate: new Date('2023-08-30'),
    },
    {
      id: 'hh-c101',
      propertyId: 'prop-c-101',
      occupancyType: 'OWNER_OCCUPIED',
      moveInDate: new Date('2022-06-18'),
    },
    {
      id: 'hh-c201',
      propertyId: 'prop-c-201',
      occupancyType: 'OWNER_OCCUPIED',
      moveInDate: new Date('2023-12-01'),
    },
    {
      id: 'hh-c301',
      propertyId: 'prop-c-301',
      occupancyType: 'OWNER_OCCUPIED',
      moveInDate: new Date('2024-05-22'),
    },
    {
      id: 'hh-c401',
      propertyId: 'prop-c-401',
      occupancyType: 'OWNER_OCCUPIED',
      moveInDate: new Date('2025-01-15'),
    },
  ],

  profiles: [
    {
      id: 'prof-thandi',
      householdId: 'hh-a101',
      userId: 'user-thandi-mokoena',
      displayName: 'Thandi Mokoena',
      profileAddress: 'thandi.a101@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'OWNER_RESIDENT',
      occupantSince: new Date('2022-03-01'),
    },
    {
      id: 'prof-lerato',
      householdId: 'hh-a201',
      userId: 'user-lerato-khumalo',
      displayName: 'Lerato Khumalo',
      profileAddress: 'lerato.a201@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'OWNER_RESIDENT',
      occupantSince: new Date('2023-07-15'),
    },
    {
      id: 'prof-amir',
      householdId: 'hh-a301',
      userId: 'user-amir-hassan',
      displayName: 'Amir Hassan',
      profileAddress: 'amir.a301@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'OWNER_RESIDENT',
      occupantSince: new Date('2024-01-10'),
    },
    {
      id: 'prof-zanele',
      householdId: 'hh-a401',
      userId: 'user-zanele-dlamini',
      displayName: 'Zanele Dlamini',
      profileAddress: 'zanele.a401@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'RENTER',
      occupantSince: new Date('2025-09-01'),
    },
    {
      id: 'prof-pieter',
      householdId: 'hh-b101',
      userId: 'user-pieter-steyn',
      displayName: 'Pieter Steyn',
      profileAddress: 'pieter.b101@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'OWNER_RESIDENT',
      occupantSince: new Date('2021-11-20'),
    },
    {
      id: 'prof-fatima',
      householdId: 'hh-b201',
      userId: 'user-fatima-adams',
      displayName: 'Fatima Adams',
      profileAddress: 'fatima.b201@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'OWNER_RESIDENT',
      occupantSince: new Date('2024-04-05'),
    },
    {
      id: 'prof-gregory',
      householdId: 'hh-b301',
      userId: 'user-gregory-naidoo',
      displayName: 'Gregory Naidoo',
      profileAddress: 'gregory.b301@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'RENTER',
      occupantSince: new Date('2025-02-12'),
    },
    {
      id: 'prof-naledi',
      householdId: 'hh-b401',
      userId: 'user-naledi-zulu',
      displayName: 'Naledi Zulu',
      profileAddress: 'naledi.b401@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'OWNER_RESIDENT',
      occupantSince: new Date('2023-08-30'),
    },
    {
      id: 'prof-rashid',
      householdId: 'hh-c101',
      userId: 'user-rashid-patel',
      displayName: 'Rashid Patel',
      profileAddress: 'rashid.c101@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'OWNER_RESIDENT',
      occupantSince: new Date('2022-06-18'),
    },
    {
      id: 'prof-tarryn',
      householdId: 'hh-c201',
      userId: 'user-tarryn-lewis',
      displayName: 'Tarryn Lewis',
      profileAddress: 'tarryn.c201@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'OWNER_RESIDENT',
      occupantSince: new Date('2023-12-01'),
    },
    {
      id: 'prof-sipho',
      householdId: 'hh-c301',
      userId: 'user-sipho-mthembu',
      displayName: 'Sipho Mthembu',
      profileAddress: 'sipho.c301@solarisheights.org',
      occupantType: 'OCCUPANT',
      residencyType: 'OWNER_RESIDENT',
      occupantSince: new Date('2024-05-22'),
    },
    // Solo seat profile — Buhle (family member in Thandi's household)
    {
      id: 'prof-buhle',
      householdId: 'hh-a101',
      userId: 'user-slh-buhle',
      displayName: 'Buhle Mokoena',
      profileAddress: 'buhle.a101@solarisheights.org',
      occupantType: 'FAMILY',
      residencyType: 'FAMILY',
      occupantSince: new Date('2022-03-01'),
    },
  ],

  standardSeats: [
    {
      id: 'seat-thandi',
      userId: 'user-thandi-mokoena',
      propertyId: 'prop-a-101',
      isPrimaryOwner: true,
      platformAddress: 'a101@solarisheights.org',
    },
    {
      id: 'seat-lerato',
      userId: 'user-lerato-khumalo',
      propertyId: 'prop-a-201',
      isPrimaryOwner: true,
      platformAddress: 'a201@solarisheights.org',
    },
    {
      id: 'seat-amir',
      userId: 'user-amir-hassan',
      propertyId: 'prop-a-301',
      isPrimaryOwner: true,
      platformAddress: 'a301@solarisheights.org',
    },
    {
      id: 'seat-zanele',
      userId: 'user-zanele-dlamini',
      propertyId: 'prop-a-401',
      isPrimaryOwner: false,
      platformAddress: 'a401@solarisheights.org',
    },
    {
      id: 'seat-pieter',
      userId: 'user-pieter-steyn',
      propertyId: 'prop-b-101',
      isPrimaryOwner: true,
      platformAddress: 'b101@solarisheights.org',
    },
    {
      id: 'seat-fatima',
      userId: 'user-fatima-adams',
      propertyId: 'prop-b-201',
      isPrimaryOwner: true,
      platformAddress: 'b201@solarisheights.org',
    },
    {
      id: 'seat-gregory',
      userId: 'user-gregory-naidoo',
      propertyId: 'prop-b-301',
      isPrimaryOwner: false,
      platformAddress: 'b301@solarisheights.org',
    },
    {
      id: 'seat-naledi',
      userId: 'user-naledi-zulu',
      propertyId: 'prop-b-401',
      isPrimaryOwner: true,
      platformAddress: 'b401@solarisheights.org',
    },
    {
      id: 'seat-rashid',
      userId: 'user-rashid-patel',
      propertyId: 'prop-c-101',
      isPrimaryOwner: true,
      platformAddress: 'c101@solarisheights.org',
    },
    {
      id: 'seat-tarryn',
      userId: 'user-tarryn-lewis',
      propertyId: 'prop-c-201',
      isPrimaryOwner: true,
      platformAddress: 'c201@solarisheights.org',
    },
    {
      id: 'seat-sipho',
      userId: 'user-sipho-mthembu',
      propertyId: 'prop-c-301',
      isPrimaryOwner: true,
      platformAddress: 'c301@solarisheights.org',
    },
  ],

  soloSeats: [
    {
      id: 'seat-buhle',
      userId: 'user-slh-buhle',
      platformAddress: 'buhle.mokoena@solarisheights.org',
      propertyId: 'prop-a-101',
      seatType: 'MEMBER',
      isComplimentary: true,
    },
  ],

  premiumSeats: [
    {
      id: 'prem-pieter',
      userId: 'user-pieter-steyn',
      platformAddress: 'pieter.steyn@solarisheights.org',
      portfolioName: 'Steyn Holdings',
      maxProperties: 3,
    },
    {
      id: 'prem-johan',
      userId: 'user-johan-botha',
      platformAddress: 'johan.botha@solarisheights.org',
      portfolioName: 'Botha Building Management',
      maxProperties: 5,
    },
  ],

  // -------------------------------------------------------------------------
  // Community services
  // -------------------------------------------------------------------------
  serviceListings: [
    {
      id: 'svc-slh-cleaning',
      providerId: 'user-slh-cleaning',
      title: 'Common Area Deep Cleaning',
      description:
        'Weekly deep cleaning of all common areas including lobbies, lifts, stairwells, and the function room. Serves Solaris Heights exclusively.',
      category: 'CLEANING',
      priceType: 'FIXED',
      price: '2400',
      serviceAreas: ['Solaris Heights'],
      availability: { weekdays: true, weekends: false, evenings: false },
      images: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400'],
      portfolio: [],
      contactMethods: ['phone', 'email'],
      verified: true,
      rating: 4.4,
      reviewCount: 18,
      status: 'ACTIVE',
      isPublished: true,
      termsAndConditions:
        'Service provided under body corporate contract. Payment monthly in advance.',
      cancellationPolicy: '48hr notice required.',
    },
    {
      id: 'svc-slh-lift',
      providerId: 'user-slh-lift-tech',
      title: 'Lift Maintenance & 24/7 Callout',
      description:
        'Scheduled monthly maintenance plus 24-hour emergency callout for all 6 passenger lifts and 1 service lift. SANS 50081 compliant.',
      category: 'MAINTENANCE',
      priceType: 'QUOTE',
      serviceAreas: ['Solaris Heights', 'Cape Town CBD', 'Cape Flats'],
      availability: { emergency: true, weekdays: true, weekends: true, evenings: true },
      licenseNumber: 'LIFT-2024-7842',
      insuranceExpiry: new Date('2027-03-31'),
      images: ['https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400'],
      portfolio: [],
      contactMethods: ['phone', 'email'],
      verified: true,
      rating: 4.8,
      reviewCount: 22,
      status: 'ACTIVE',
      isPublished: true,
      termsAndConditions: 'Annual service contract required. Emergency callout included.',
      cancellationPolicy: '2hr cancellation notice for emergency callouts.',
    },
    {
      id: 'svc-slh-electrical',
      providerId: 'user-slh-mike-electric',
      title: 'In-Unit Electrical Repairs',
      description:
        'Qualified residential electrician. COC certificates for unit renovations. Familiar with Solaris Heights distribution board layout.',
      category: 'ELECTRICAL',
      priceType: 'HOURLY',
      price: '320',
      serviceAreas: ['Solaris Heights', 'Cape Flats'],
      availability: { weekdays: true, weekends: false, evenings: false },
      licenseNumber: 'ELE-2023-2231',
      insuranceExpiry: new Date('2026-12-31'),
      images: ['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400'],
      portfolio: [],
      contactMethods: ['phone', 'email'],
      verified: true,
      rating: 4.6,
      reviewCount: 11,
      status: 'ACTIVE',
      isPublished: true,
      termsAndConditions: 'All work complies with SANS 10142. 6-month workmanship guarantee.',
      cancellationPolicy: '24hr notice required.',
    },
    {
      id: 'svc-slh-garden',
      providerId: 'user-slh-garden-svc',
      title: 'Rooftop & Courtyard Garden Maintenance',
      description:
        'Specialist in small-space urban gardening. Maintains the rooftop herb garden and ground-floor courtyard planters.',
      category: 'GARDENING',
      priceType: 'HOURLY',
      price: '200',
      serviceAreas: ['Solaris Heights'],
      availability: { weekdays: true, weekends: true, evenings: false },
      images: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400'],
      portfolio: [],
      contactMethods: ['phone', 'email'],
      verified: false,
      rating: 4.7,
      reviewCount: 6,
      status: 'ACTIVE',
      isPublished: true,
      termsAndConditions: 'Plants and materials charged at cost plus 15%.',
      cancellationPolicy: '24hr cancellation notice required.',
    },
  ],

  serviceReviews: [
    {
      id: 'slh-review-cleaning-1',
      listingId: 'svc-slh-cleaning',
      reviewerId: 'user-thandi-mokoena',
      rating: 4,
      title: 'Reliable weekly service',
      comment:
        'They show up on time every week and the lobby has never looked better. Occasional missed spot on the 5th floor, but otherwise solid.',
      serviceDate: new Date('2026-05-15'),
      responseQuality: 4,
      isPublished: true,
    },
    {
      id: 'slh-review-lift-1',
      listingId: 'svc-slh-lift',
      reviewerId: 'user-pieter-steyn',
      rating: 5,
      title: 'Saved us during a power outage',
      comment:
        'Lifts were stuck after the storm. Their technician was on-site in under an hour and we were back in business by lunchtime.',
      serviceDate: new Date('2026-04-20'),
      responseQuality: 5,
      isPublished: true,
    },
    {
      id: 'slh-review-electrical-1',
      listingId: 'svc-slh-electrical',
      reviewerId: 'user-lerato-khumalo',
      rating: 5,
      title: 'Installed our new extractor fan',
      comment: 'Quick, professional, and the quote matched the invoice exactly. Will use again.',
      serviceDate: new Date('2026-05-02'),
      responseQuality: 5,
      isPublished: true,
    },
  ],

  // -------------------------------------------------------------------------
  // Groups
  // -------------------------------------------------------------------------
  groups: [
    {
      id: 'group-slh-rooftop-garden',
      name: 'Rooftop Gardeners',
      description: 'Tending the herb garden on the rooftop of Block A. All skill levels welcome.',
      category: 'urban-gardening',
      color: '#10b981',
      isPublic: true,
      residentFilter: 'ALL',
      ownerId: 'user-lerato-khumalo',
    },
    {
      id: 'group-slh-yoga',
      name: 'Sunset Yoga',
      description: 'Wednesday evening yoga sessions in the function room. Mats provided.',
      category: 'fitness',
      color: '#a855f7',
      isPublic: true,
      residentFilter: 'ALL',
      ownerId: 'user-lerato-khumalo',
    },
    {
      id: 'group-slh-book-club',
      name: 'High-Rise Book Club',
      description: 'Monthly book discussion in the function room. Wine and cheese optional.',
      category: 'book-club',
      color: '#f59e0b',
      isPublic: true,
      residentFilter: 'ALL',
      ownerId: 'user-tarryn-lewis',
    },
    {
      id: 'group-slh-runners',
      name: 'Block-to-Block Runners',
      description: 'Pre-dawn running group. 5km loop around the complex, all paces welcome.',
      category: 'fitness',
      color: '#ef4444',
      isPublic: true,
      residentFilter: 'ALL',
      ownerId: 'user-amir-hassan',
    },
    {
      id: 'group-slh-cooks',
      name: 'High-Rise Foodies',
      description: 'Pot-luck dinners, recipe swaps, and a monthly restaurant outing.',
      category: 'cooking',
      color: '#f97316',
      isPublic: true,
      residentFilter: 'ALL',
      ownerId: 'user-zanele-dlamini',
    },
  ],

  groupMembers: [
    {
      id: 'ug-slh-lerato-garden',
      userId: 'user-lerato-khumalo',
      groupId: 'group-slh-rooftop-garden',
      role: 'ADMIN',
    },
    {
      id: 'ug-slh-amir-garden',
      userId: 'user-amir-hassan',
      groupId: 'group-slh-rooftop-garden',
      role: 'MEMBER',
    },
    {
      id: 'ug-slh-fatima-garden',
      userId: 'user-fatima-adams',
      groupId: 'group-slh-rooftop-garden',
      role: 'MEMBER',
    },
    {
      id: 'ug-slh-lerato-yoga',
      userId: 'user-lerato-khumalo',
      groupId: 'group-slh-yoga',
      role: 'ADMIN',
    },
    {
      id: 'ug-slh-zanele-yoga',
      userId: 'user-zanele-dlamini',
      groupId: 'group-slh-yoga',
      role: 'MEMBER',
    },
    {
      id: 'ug-slh-tarryn-bookclub',
      userId: 'user-tarryn-lewis',
      groupId: 'group-slh-book-club',
      role: 'ADMIN',
    },
    {
      id: 'ug-slh-thandi-bookclub',
      userId: 'user-thandi-mokoena',
      groupId: 'group-slh-book-club',
      role: 'MEMBER',
    },
    {
      id: 'ug-slh-amir-runners',
      userId: 'user-amir-hassan',
      groupId: 'group-slh-runners',
      role: 'ADMIN',
    },
    {
      id: 'ug-slh-sipho-runners',
      userId: 'user-sipho-mthembu',
      groupId: 'group-slh-runners',
      role: 'MEMBER',
    },
    {
      id: 'ug-slh-zanele-cooks',
      userId: 'user-zanele-dlamini',
      groupId: 'group-slh-cooks',
      role: 'ADMIN',
    },
    {
      id: 'ug-slh-naledi-cooks',
      userId: 'user-naledi-zulu',
      groupId: 'group-slh-cooks',
      role: 'MEMBER',
    },
  ],

  // -------------------------------------------------------------------------
  // Resources (governance, by-laws, financial)
  // -------------------------------------------------------------------------
  resources: [
    {
      id: 'res-slh-conduct-rules',
      title: 'Body Corporate Conduct Rules',
      description:
        'Rules governing Solaris Heights. Covers noise (quiet hours 22:00-07:00), pets (max 2 cats OR 1 dog per unit), balcony use, short-term letting (not permitted), and parking.',
      category: 'GOVERNANCE',
      fileUrl: '/resources/slh/conduct-rules.pdf',
      fileType: 'application/pdf',
      fileSize: 720000,
      version: '3.1',
      visibility: 'ALL_RESIDENTS',
      authorId: 'user-thandi-mokoena',
      publishedAt: new Date('2026-01-15'),
    },
    {
      id: 'res-slh-csos-act',
      title: 'CSOS Act Summary',
      description:
        'Summary of the Community Schemes Ombud Service Act and the dispute resolution process available to all owners.',
      category: 'LEGAL',
      fileUrl: '/resources/slh/csos-summary.pdf',
      fileType: 'application/pdf',
      fileSize: 480000,
      version: '2.0',
      visibility: 'OWNERS_ONLY',
      authorId: 'user-pieter-steyn',
      publishedAt: new Date('2025-08-20'),
    },
    {
      id: 'res-slh-levies-2026',
      title: 'Monthly Levies Schedule 2026',
      description:
        'Current monthly levy per unit (varies by floor and view), due dates, and late-payment policy.',
      category: 'FINANCIAL',
      fileUrl: '/resources/slh/levies-2026.pdf',
      fileType: 'application/pdf',
      fileSize: 220000,
      version: '2026.1',
      visibility: 'OWNERS_ONLY',
      authorId: 'user-pieter-steyn',
      publishedAt: new Date('2026-01-05'),
    },
    {
      id: 'res-slh-budget-2026',
      title: 'Annual Budget 2026',
      description:
        'Body corporate annual budget including lift maintenance contract, security, insurance, cleaning, and reserve fund allocations.',
      category: 'FINANCIAL',
      fileUrl: '/resources/slh/budget-2026.pdf',
      fileType: 'application/pdf',
      fileSize: 590000,
      version: '1.0',
      visibility: 'OWNERS_ONLY',
      authorId: 'user-pieter-steyn',
      publishedAt: new Date('2026-01-10'),
    },
    {
      id: 'res-slh-fire-safety',
      title: 'Fire Safety Plan',
      description:
        'Building fire safety plan, evacuation procedures, fire drill schedule, and assembly points. Mandatory reading for all residents.',
      category: 'GOVERNANCE',
      fileUrl: '/resources/slh/fire-safety.pdf',
      fileType: 'application/pdf',
      fileSize: 850000,
      version: '4.2',
      visibility: 'ALL_RESIDENTS',
      authorId: 'user-johan-botha',
      publishedAt: new Date('2025-11-30'),
    },
    {
      id: 'res-slh-lift-manual',
      title: 'Lift Manual & Callout Procedures',
      description:
        'Passenger lift operation guide, what to do if you get stuck, and how to call for emergency assistance.',
      category: 'DIY',
      fileUrl: '/resources/slh/lift-manual.pdf',
      fileType: 'application/pdf',
      fileSize: 320000,
      version: '1.5',
      visibility: 'ALL_RESIDENTS',
      authorId: 'user-johan-botha',
      publishedAt: new Date('2025-09-15'),
    },
    {
      id: 'res-slh-board-q1',
      title: 'Board Report Q1 2026',
      description:
        'Quarterly board report covering lift refurbishment project, levy collection rate (96%), and the new function-room booking policy.',
      category: 'BOARD_REPORT',
      fileUrl: '/resources/slh/board-q1-2026.pdf',
      fileType: 'application/pdf',
      fileSize: 620000,
      version: '1.0',
      visibility: 'ALL_RESIDENTS',
      authorId: 'user-thandi-mokoena',
      publishedAt: new Date('2026-04-05'),
    },
  ],

  // -------------------------------------------------------------------------
  // Content
  // -------------------------------------------------------------------------
  content: [
    {
      id: 'slh-news-lift-refurb',
      title: { en: 'Lift Refurbishment Project — Phase 1 Complete' },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Phase 1 of the lift refurbishment project is now complete. All 6 passenger lifts have been upgraded with new control panels, LED lighting, and emergency communication systems. Phase 2 (the service lift) will begin next month. Thank you for your patience during the disruptions.',
              },
            ],
          },
        ],
      },
      excerpt: { en: 'All 6 passenger lifts upgraded with new controls and lighting' },
      image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80',
      category: 'NEWS',
      tags: ['lifts', 'refurbishment', 'building-upgrade'],
      authorId: 'user-johan-botha',
      published: true,
      featured: true,
      publishedAt: new Date('2026-05-15'),
    },
    {
      id: 'slh-news-rooftop-harvest',
      title: { en: 'Rooftop Herb Garden First Harvest' },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'The rooftop garden group celebrated its first harvest this week — basil, mint, rosemary, and chillies all made it into a community potjie on Saturday evening. The function room smelled incredible and we raised R450 for the building charity fund. Join us on the rooftop every Wednesday at 17:00 to help tend the beds.',
              },
            ],
          },
        ],
      },
      excerpt: { en: 'First harvest turned into a community potjie evening' },
      image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
      category: 'NEWS',
      tags: ['rooftop-garden', 'community', 'harvest', 'urban-gardening'],
      authorId: 'user-lerato-khumalo',
      published: true,
      featured: true,
      publishedAt: new Date('2026-05-10'),
    },
    {
      id: 'slh-announcement-fire-drill',
      title: { en: 'Fire Drill — Saturday 21 June' },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'The annual fire drill will take place on Saturday 21 June at 10:00. All residents must evacuate via the marked stairwells and assemble at the designated point in the parking lot. Lifts will be deactivated for the duration. The drill will last approximately 30 minutes. Please review the fire safety plan ahead of time.',
              },
            ],
          },
        ],
      },
      excerpt: { en: 'Mandatory annual drill — Saturday 21 June at 10:00' },
      category: 'ANNOUNCEMENT',
      tags: ['fire-drill', 'safety', 'mandatory', 'evacuation'],
      authorId: 'user-johan-botha',
      published: true,
      featured: false,
      publishedAt: new Date('2026-06-01'),
    },
    {
      id: 'slh-announcement-generator',
      title: { en: 'Backup Generator Test — Friday 13 June' },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Scheduled test of the backup generator and UPS systems on Friday 13 June between 09:00 and 11:00. Expect brief power interruptions to common areas (lifts, lobby, parking). Residential units will be unaffected. Please plan accordingly.',
              },
            ],
          },
        ],
      },
      excerpt: { en: 'Brief outages to common areas expected — residential units unaffected' },
      category: 'ANNOUNCEMENT',
      tags: ['generator', 'power', 'maintenance', 'schedule'],
      authorId: 'user-johan-botha',
      published: true,
      featured: false,
      publishedAt: new Date('2026-06-05'),
    },
    {
      id: 'slh-blog-yoga',
      title: { en: 'Why I Started Doing Yoga in the Function Room' },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'When I moved into Solaris Heights three years ago, I never expected to find my exercise community in a function room. But the Wednesday sunset yoga group has become the highlight of my week. Here is what I have learned about building community in a vertical neighbourhood.',
              },
            ],
          },
        ],
      },
      excerpt: { en: 'Building community in a vertical neighbourhood' },
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
      category: 'BLOG',
      tags: ['yoga', 'community', 'wellness', 'vertical-living'],
      authorId: 'user-lerato-khumalo',
      published: true,
      featured: false,
      publishedAt: new Date('2026-04-20'),
    },
    {
      id: 'slh-blog-city-living',
      title: { en: 'My First Year in a High-Rise' },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Twelve months ago I moved from a free-standing house into a 4th-floor apartment in Block B. Here is what I wish I had known about the trade-offs — the pros are obvious (security, no garden maintenance, location), the cons took me by surprise (soundproofing, parking, dealing with the body corporate).',
              },
            ],
          },
        ],
      },
      excerpt: { en: 'Lessons from my first year of vertical living' },
      category: 'BLOG',
      tags: ['high-rise', 'city-living', 'apartment', 'experience'],
      authorId: 'user-gregory-naidoo',
      published: true,
      featured: false,
      publishedAt: new Date('2026-04-15'),
    },
    {
      id: 'slh-blog-rooftop-garden',
      title: { en: 'From Balcony to Rooftop: Our Urban Garden Story' },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'What started as two tomato plants on my balcony has grown into a 30-square-metre rooftop garden tended by 14 residents. Here is how we organised, what we grow, and what we have learned about gardening at altitude.',
              },
            ],
          },
        ],
      },
      excerpt: { en: 'How our balcony garden grew into a 14-person rooftop co-op' },
      image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800&q=80',
      category: 'BLOG',
      tags: ['urban-gardening', 'rooftop', 'community', 'sustainability'],
      authorId: 'user-fatima-adams',
      published: true,
      featured: false,
      publishedAt: new Date('2026-04-08'),
    },
    {
      id: 'slh-event-yoga-weekly',
      title: { en: 'Sunset Yoga — Weekly' },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Wind down your Wednesday with a 45-minute sunset yoga session in the function room. Suitable for all levels — beginners very welcome. Mats provided; just bring comfortable clothes and a water bottle.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'When & Where' }],
          },
          { type: 'paragraph', content: [{ type: 'text', text: '📅 Every Wednesday at 18:30' }] },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '📍 Function Room, Block A Ground Floor' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '👤 Led by Lerato Khumalo (certified instructor)' }],
          },
        ],
      },
      excerpt: { en: 'Wind down Wednesdays with sunset yoga in the function room' },
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
      category: 'EVENT',
      tags: ['yoga', 'weekly', 'wellness', 'fitness'],
      authorId: 'user-lerato-khumalo',
      published: true,
      featured: false,
      publishedAt: new Date('2026-05-01'),
    },
    {
      id: 'slh-event-agm',
      title: { en: 'Solaris Heights AGM 2026' },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Annual General Meeting of the Solaris Heights Body Corporate. Agenda includes audited financial statements, budget approval for 2026/27, trustee elections, and a presentation on the lift refurbishment phase 2.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'When & Where' }],
          },
          { type: 'paragraph', content: [{ type: 'text', text: '📅 28 June 2026 at 10:00 AM' }] },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '📍 Function Room, Block A Ground Floor' }],
          },
          { type: 'paragraph', content: [{ type: 'text', text: '👤 Board of Trustees' }] },
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Welcome and confirmation of quorum' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Minutes of the previous AGM' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Audited financial statements 2025/26' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: 'Budget approval for 2026/27 (incl. lift phase 2)' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Election of 2 trustee vacancies' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'General business' }] },
                ],
              },
            ],
          },
        ],
      },
      excerpt: { en: 'Financials, budget, lift phase 2, and trustee elections' },
      image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
      category: 'EVENT',
      tags: ['agm', 'body-corporate', 'mandatory', 'owners'],
      authorId: 'user-thandi-mokoena',
      published: true,
      featured: true,
      publishedAt: new Date('2026-05-15'),
      expiresAt: new Date('2026-06-29'),
    },
    {
      id: 'slh-event-fireside',
      title: { en: 'High-Rise Book Club: Fireside Reads' },
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This month: a curated short-story collection themed around "Home". Bring your favourite short story (max 10 minutes to read aloud) and a beverage of choice. We will discuss the stories, swap recommendations, and enjoy some cheese and crackers.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'When & Where' }],
          },
          { type: 'paragraph', content: [{ type: 'text', text: '📅 20 June 2026 at 19:00' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '📍 Function Room' }] },
          { type: 'paragraph', content: [{ type: 'text', text: '👤 Hosted by Tarryn Lewis' }] },
        ],
      },
      excerpt: { en: 'Short stories about home — bring your favourite to read aloud' },
      category: 'EVENT',
      tags: ['book-club', 'reading', 'social', 'monthly'],
      authorId: 'user-tarryn-lewis',
      published: true,
      featured: false,
      publishedAt: new Date('2026-05-20'),
      expiresAt: new Date('2026-06-21'),
    },
  ],

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------
  events: [
    {
      id: 'slh-event-rooftop-harvest',
      title: 'Rooftop Harvest Potjie',
      description:
        'Celebrate the rooftop garden harvest with a community potjie on the rooftop of Block A. Bring a side, drinks, and your appetite.',
      date: new Date('2026-06-14T18:00:00+02:00'),
      location: 'Rooftop, Block A',
      organizer: 'Rooftop Gardeners',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
      isPublic: true,
    },
    {
      id: 'slh-event-yoga-wed',
      title: 'Sunset Yoga (Weekly)',
      description:
        'Weekly 45-minute sunset yoga in the function room. All levels welcome, mats provided.',
      date: new Date('2026-06-04T18:30:00+02:00'),
      location: 'Function Room, Block A',
      organizer: 'Lerato Khumalo',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
      isPublic: true,
    },
    {
      id: 'slh-event-agm',
      title: 'Solaris Heights AGM 2026',
      description:
        'Annual General Meeting — financials, budget, lift phase 2, trustee elections. All owners must attend.',
      date: new Date('2026-06-28T10:00:00+02:00'),
      location: 'Function Room, Block A',
      organizer: 'Board of Trustees',
      image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
      isPublic: true,
    },
    {
      id: 'slh-event-fire-drill',
      title: 'Annual Fire Drill',
      description:
        'Mandatory annual fire drill. All residents evacuate via marked stairwells to the parking lot assembly point.',
      date: new Date('2026-06-21T10:00:00+02:00'),
      location: 'All blocks — assemble at parking lot',
      organizer: 'Johan Botha',
      isPublic: true,
    },
    {
      id: 'slh-event-bookclub',
      title: 'High-Rise Book Club: Fireside Reads',
      description:
        'Short-story collection themed around "Home". Bring a story to read aloud and a beverage of choice.',
      date: new Date('2026-06-20T19:00:00+02:00'),
      location: 'Function Room',
      organizer: 'Tarryn Lewis',
      isPublic: true,
    },
  ],

  // -------------------------------------------------------------------------
  // Surveys
  // -------------------------------------------------------------------------
  surveys: [
    {
      id: 'slh-survey-amenities',
      title: 'Amenities & Common Areas 2026',
      description:
        "Help us prioritise amenity upgrades for the 2026/27 financial year. Your input shapes next year's capital expenditure.",
      type: 'INTERNAL',
      status: 'ACTIVE',
      startDate: new Date('2026-04-15'),
      endDate: new Date('2026-06-30'),
    },
    {
      id: 'slh-survey-noise',
      title: 'Noise & Quiet Hours Feedback',
      description:
        'Following recent complaints, the board is reviewing our noise and quiet-hours policy. Please share your experience.',
      type: 'INTERNAL',
      status: 'ACTIVE',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-06-15'),
    },
  ],

  surveyQuestions: [
    {
      id: 'slh-q-amen-1',
      surveyId: 'slh-survey-amenities',
      text: 'Which amenity should the body corporate prioritise upgrading?',
      type: 'SINGLE_CHOICE',
      options: [
        'Function room AV system',
        'Gym equipment',
        'Rooftop garden expansion',
        "Children's play area",
        'EV charging stations',
      ],
      required: true,
      order: 1,
    },
    {
      id: 'slh-q-amen-2',
      surveyId: 'slh-survey-amenities',
      text: 'How often do you use the rooftop garden?',
      type: 'SINGLE_CHOICE',
      options: ['Never', 'Occasionally', 'Weekly', 'Several times a week'],
      required: true,
      order: 2,
    },
    {
      id: 'slh-q-amen-3',
      surveyId: 'slh-survey-amenities',
      text: 'Would you support a special levy to fund the chosen upgrade?',
      type: 'YES_NO',
      options: ['Yes', 'No'],
      required: true,
      order: 3,
    },
    {
      id: 'slh-q-amen-4',
      surveyId: 'slh-survey-amenities',
      text: 'Any other suggestions for our common areas?',
      type: 'TEXT',
      options: [],
      required: false,
      order: 4,
    },
    {
      id: 'slh-q-noise-1',
      surveyId: 'slh-survey-noise',
      text: 'How often are you disturbed by noise from neighbours?',
      type: 'RATING',
      options: ['1', '2', '3', '4', '5'],
      required: true,
      order: 1,
    },
    {
      id: 'slh-q-noise-2',
      surveyId: 'slh-survey-noise',
      text: 'When does the noise usually happen?',
      type: 'MULTIPLE_CHOICE',
      options: ['Early morning', 'Daytime', 'Evening', 'Late night'],
      required: true,
      order: 2,
    },
    {
      id: 'slh-q-noise-3',
      surveyId: 'slh-survey-noise',
      text: 'Should the quiet-hours policy be enforced more strictly?',
      type: 'YES_NO',
      options: ['Yes', 'No'],
      required: true,
      order: 3,
    },
  ],

  surveyResponses: [
    {
      id: 'slh-resp-amen-1',
      surveyId: 'slh-survey-amenities',
      userId: 'user-lerato-khumalo',
      answers: {
        'slh-q-amen-1': 'Rooftop garden expansion',
        'slh-q-amen-2': 'Several times a week',
        'slh-q-amen-3': 'Yes',
        'slh-q-amen-4': 'Add a composting system to the rooftop.',
      },
    },
    {
      id: 'slh-resp-amen-2',
      surveyId: 'slh-survey-amenities',
      userId: 'user-amir-hassan',
      answers: {
        'slh-q-amen-1': 'EV charging stations',
        'slh-q-amen-2': 'Never',
        'slh-q-amen-3': 'Yes',
        'slh-q-amen-4': '',
      },
    },
    {
      id: 'slh-resp-amen-3',
      surveyId: 'slh-survey-amenities',
      userId: 'user-thandi-mokoena',
      answers: {
        'slh-q-amen-1': 'Gym equipment',
        'slh-q-amen-2': 'Weekly',
        'slh-q-amen-3': 'Yes',
        'slh-q-amen-4': 'Treadmill and rowing machine please.',
      },
    },
    {
      id: 'slh-resp-noise-1',
      surveyId: 'slh-survey-noise',
      userId: 'user-gregory-naidoo',
      answers: { 'slh-q-noise-1': '4', 'slh-q-noise-2': ['Late night'], 'slh-q-noise-3': 'Yes' },
    },
  ],

  // -------------------------------------------------------------------------
  // Competitions
  // -------------------------------------------------------------------------
  competitions: [
    {
      id: 'slh-comp-balcony-garden',
      title: 'Best Balcony Garden 2026',
      description:
        'Show off your green thumb! Submit photos of your balcony, window-box, or rooftop garden. Categories: best edibles, best flowers, best small-space design.',
      rules:
        '1. Garden must be within Solaris Heights boundaries (balcony, window box, or rooftop bed).\n2. Submit up to 3 photos.\n3. Brief description of your setup and what you grow.\n4. Judging by the rooftop garden group + a guest judge from the local nursery.',
      prizeInfo:
        '🥇 Best Overall: R1,500 garden centre voucher + trophy\n🌱 Best Edibles: R750 voucher\n🌸 Best Flowers: R500 voucher',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-08-31'),
      status: 'ACTIVE',
      entryCount: 7,
    },
  ],

  // -------------------------------------------------------------------------
  // Maintenance — building systems focused
  // -------------------------------------------------------------------------
  maintenanceCategories: [
    {
      id: 'slh-cat-lifts',
      value: 'LIFTS',
      label: 'Lifts & Elevators',
      description: 'Passenger lifts, service lift, and lift shaft issues',
      isActive: true,
    },
    {
      id: 'slh-cat-electrical',
      value: 'ELECTRICAL',
      label: 'Electrical',
      description: 'Common-area electrical, distribution board issues',
      isActive: true,
    },
    {
      id: 'slh-cat-plumbing',
      value: 'PLUMBING',
      label: 'Plumbing',
      description: 'Common stacks, water supply, drainage',
      isActive: true,
    },
    {
      id: 'slh-cat-fire',
      value: 'FIRE',
      label: 'Fire & Safety',
      description: 'Fire alarms, sprinklers, evacuation systems',
      isActive: true,
    },
    {
      id: 'slh-cat-security',
      value: 'SECURITY',
      label: 'Security',
      description: 'Access control, intercoms, CCTV, security gates',
      isActive: true,
    },
    {
      id: 'slh-cat-cleaning',
      value: 'CLEANING',
      label: 'Cleaning',
      description: 'Common-area cleaning issues',
      isActive: true,
    },
    {
      id: 'slh-cat-generators',
      value: 'GENERATORS',
      label: 'Generators & UPS',
      description: 'Backup power systems',
      isActive: true,
    },
    {
      id: 'slh-cat-network',
      value: 'NETWORK',
      label: 'Network',
      description: 'Building fibre, Wi-Fi in common areas',
      isActive: true,
    },
    {
      id: 'slh-cat-other',
      value: 'OTHER',
      label: 'Other',
      description: 'Anything else',
      isActive: true,
    },
  ],

  maintenanceTeams: [
    {
      id: 'slh-team-lifts',
      name: 'Lifts Team',
      trade: 'LIFTS',
      contactName: 'Cape Lift Services (contracted)',
      isActive: true,
    },
    {
      id: 'slh-team-electrical',
      name: 'Building Electrical',
      trade: 'ELECTRICAL',
      contactName: 'Mike Electric (SLH)',
      isActive: true,
    },
    {
      id: 'slh-team-cleaning',
      name: 'Cleaning Team',
      trade: 'CLEANING',
      contactName: 'Shine Building Cleaners (contracted)',
      isActive: true,
    },
    {
      id: 'slh-team-fire',
      name: 'Fire & Safety Team',
      trade: 'FIRE',
      contactName: 'Johan Botha (Building Manager)',
      isActive: true,
    },
  ],

  serviceProviders: [
    {
      id: 'slh-prov-lift',
      companyName: 'Cape Lift Services',
      trade: 'LIFTS',
      phone: '+27 21 555 0100',
      isActive: true,
    },
    {
      id: 'slh-prov-fire',
      companyName: 'SafeFire Compliance',
      trade: 'FIRE',
      phone: '+27 21 555 0150',
      isActive: true,
    },
    {
      id: 'slh-prov-gen',
      companyName: 'GenServe Africa',
      trade: 'GENERATORS',
      phone: '+27 21 555 0180',
      isActive: true,
    },
    {
      id: 'slh-prov-network',
      companyName: 'MetroFibre Building Solutions',
      trade: 'NETWORK',
      phone: '+27 21 555 0190',
      isActive: true,
    },
  ],

  maintenanceRequests: [
    {
      id: 'slh-mr-lift-b',
      userId: 'user-fatima-adams',
      category: 'LIFTS',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      ticketNumber: 'SLH-2026-0001',
      assignedProviderId: 'slh-prov-lift',
      description:
        'Passenger lift in Block B making a grinding noise between floors 3 and 4. Sometimes stops short of the floor by 10cm. Has happened three times in the past week.',
      images: [],
      createdAt: new Date('2026-06-01T00:00:00Z'),
      updatedAt: new Date('2026-06-03T15:00:00Z'),
    },
    {
      id: 'slh-mr-fire-panel',
      userId: 'user-johan-botha',
      category: 'FIRE',
      priority: 'EMERGENCY',
      status: 'ASSIGNED',
      ticketNumber: 'SLH-2026-0002',
      assignedTeamId: 'slh-team-fire',
      description:
        'Fire panel in Block C showing fault on zone 3 (floors 7-10). Detector beeping intermittently. Need technician on-site to identify and clear the fault before tonight.',
      images: [],
      createdAt: new Date('2026-06-04T08:00:00Z'),
      updatedAt: new Date('2026-06-04T08:30:00Z'),
    },
    {
      id: 'slh-mr-water-pressure',
      userId: 'user-pieter-steyn',
      category: 'PLUMBING',
      priority: 'MEDIUM',
      status: 'SUBMITTED',
      ticketNumber: 'SLH-2026-0003',
      description:
        'Water pressure in unit B101 has been very low for the past 3 days. Showers are barely usable. No reported issues in other units but I noticed the booster pump on the ground floor sounded strained yesterday.',
      images: [],
      createdAt: new Date('2026-06-03T00:00:00Z'),
      updatedAt: new Date('2026-06-03T00:00:00Z'),
    },
    {
      id: 'slh-mr-intercom',
      userId: 'user-thandi-mokoena',
      category: 'SECURITY',
      priority: 'MEDIUM',
      status: 'COMPLETED',
      ticketNumber: 'SLH-2026-0004',
      description:
        'Intercom at Block A main entrance has been failing intermittently. Visitors have been stuck at the gate. Building manager notified.',
      images: [],
      createdAt: new Date('2026-05-20T00:00:00Z'),
      updatedAt: new Date('2026-05-28T00:00:00Z'),
    },
    {
      id: 'slh-mr-network',
      userId: 'user-gregory-naidoo',
      category: 'NETWORK',
      priority: 'LOW',
      status: 'SUBMITTED',
      ticketNumber: 'SLH-2026-0005',
      description:
        'Building Wi-Fi in the function room has been very slow for the past 2 weeks. The signal in the lobby and rooftop is fine. Possibly an access point issue.',
      images: [],
      createdAt: new Date('2026-06-02T00:00:00Z'),
      updatedAt: new Date('2026-06-02T00:00:00Z'),
    },
  ],

  settings: [
    { id: 'slh-setting-ticket-format', key: 'ticket_number_format', value: 'SLH-{YYYY}-{NNNN}' },
  ],
};
