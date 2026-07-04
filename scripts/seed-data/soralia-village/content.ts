import type { ContentInput } from '../types';

export const content: ContentInput[] = [
  {
    id: 'news-alien-plant-removal',
    title: { en: 'Successful Alien Plant Removal Initiative' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Our community volunteers removed over 500 invasive alien plants from the wetland area this month, including Port Jackson willows and Australian acacias. This effort has significantly improved the habitat for our endemic fynbos species.',
            },
          ],
        },
      ],
    },
    excerpt: { en: '500+ invasive plants removed by volunteers' },
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
    category: 'NEWS',
    tags: ['conservation', 'volunteering', 'environment', 'wetlands', 'fynbos'],
    authorId: 'user-david-vdm',
    published: true,
    featured: true,
    publishedAt: new Date('2026-03-15'),
  },
  {
    id: 'news-bird-species',
    title: { en: 'New Bird Species Spotted in Reserve' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'A rare African palm swift has been spotted in our conservation area, marking the 47th bird species recorded in Soralia Nature Reserve. The sighting was confirmed by local ornithologist Dr. Naidoo during the annual bird count.',
            },
          ],
        },
      ],
    },
    excerpt: { en: '47th bird species recorded in Soralia Nature Reserve' },
    image: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&q=80',
    category: 'NEWS',
    tags: ['conservation', 'birds', 'wildlife', 'nature', 'reserve'],
    authorId: 'user-david-vdm',
    published: true,
    featured: false,
    publishedAt: new Date('2026-02-28'),
  },
  {
    id: 'news-community-hall-renovation',
    title: { en: 'Community Hall Renovation Complete' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The long-awaited community hall renovation has been completed on time and within budget. The upgraded facility now includes a modern kitchen, improved lighting, and wheelchair-accessible restrooms. Bookings are now open for all residents.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Upgraded facility now available for bookings' },
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80',
    category: 'ANNOUNCEMENT',
    tags: ['community', 'facilities', 'renovation', 'bookings'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: true,
    publishedAt: new Date('2026-04-01'),
  },
  {
    id: 'blog-gardening-tips',
    title: { en: 'Spring Gardening Tips for Soralia Residents' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'As spring arrives in our beautiful community, here are some tips for maintaining your garden. Remember to use drought-resistant plants native to our fynbos region to help conserve water and support local wildlife.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Essential tips for spring gardening in our climate' },
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
    category: 'BLOG',
    tags: ['gardening', 'spring', 'tips', 'fynbos', 'water-conservation'],
    authorId: 'user-john-smith',
    published: true,
    featured: false,
    publishedAt: new Date('2026-03-01'),
  },
  {
    id: 'blog-photography-fynbos',
    title: { en: 'Capturing Fynbos: A Photography Guide' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The golden hour light transforms our local fynbos vegetation into something magical. Here are my tips for capturing the beauty of our unique ecosystem with your camera, including the best locations and times for photography in Soralia.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Tips for capturing our unique fynbos ecosystem' },
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&q=80',
    category: 'BLOG',
    tags: ['photography', 'fynbos', 'nature', 'tips'],
    authorId: 'user-michael-chen',
    published: true,
    featured: false,
    publishedAt: new Date('2026-02-15'),
  },
  {
    id: 'announcement-pool-maintenance',
    title: { en: 'Community Pool Schedule Update' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Due to increased usage this summer, we will be performing weekly maintenance on the community pool every Tuesday from 8-10 AM. The pool will be closed during this time. We apologize for any inconvenience.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Weekly pool maintenance every Tuesday 8-10 AM' },
    category: 'ANNOUNCEMENT',
    tags: ['pool', 'maintenance', 'schedule', 'facilities'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: false,
    publishedAt: new Date('2026-04-05'),
  },
  {
    id: 'conservation-wetland-update',
    title: { en: 'Wetland Restoration Progress Report' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Six months into our wetland restoration project, we have seen remarkable improvements. Water quality tests show a 40% reduction in nutrient runoff, and three new frog species have returned to the area. The indigenous plantings are thriving.',
            },
          ],
        },
      ],
    },
    excerpt: { en: '40% reduction in nutrient runoff, new species returning' },
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&q=80',
    category: 'CONSERVATION',
    tags: ['wetland', 'restoration', 'conservation', 'wildlife', 'water-quality'],
    authorId: 'user-david-vdm',
    published: true,
    featured: true,
    publishedAt: new Date('2026-03-20'),
  },
  {
    id: 'blog-yoga-beginners',
    title: { en: 'Finding Peace Through Morning Yoga' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'In our busy community life, finding moments of peace is essential. Yoga has been transformative for me - both physically and mentally. Here are some poses I recommend for beginners, and how our beautiful Soralia surroundings make the perfect backdrop for morning practice.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'How morning yoga transformed my daily routine' },
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    category: 'BLOG',
    tags: ['yoga', 'wellness', 'mindfulness', 'morning-routine'],
    authorId: 'user-priya-naidoo',
    published: true,
    featured: false,
    publishedAt: new Date('2026-03-10'),
  },
  {
    id: 'blog-leaseholder-experience',
    title: { en: 'Life as a Leaseholder in Soralia' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Being a leaseholder in Soralia Village has been an incredible experience. The community is so welcoming, and I love being able to participate in all the activities. The platform makes it easy to connect with neighbours and stay informed about community events.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Why renting in Soralia feels like home' },
    category: 'BLOG',
    tags: ['leaseholder', 'community', 'experience', 'welcoming'],
    authorId: 'user-anna-patel',
    published: true,
    featured: false,
    publishedAt: new Date('2026-02-20'),
  },
  {
    id: 'blog-football-community',
    title: { en: 'Building Community Through Football' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Football has always been my passion, and I believe it can bring our community together. I have been organising informal kickabouts at the community park on Saturday afternoons, and the turnout has been amazing. Let us make it a regular thing!',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'How Saturday football brings neighbours together' },
    image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
    category: 'BLOG',
    tags: ['football', 'community', 'sports', 'fitness'],
    authorId: 'user-james-okonkwo',
    published: true,
    featured: false,
    publishedAt: new Date('2026-03-25'),
  },
  {
    id: 'blog-art-garden',
    title: { en: 'Painting the Soralia Landscape' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'There is something magical about the way the light hits the mountains behind our village at sunset. As both an artist and a gardener, I find endless inspiration in the natural beauty surrounding us. Here are some of my recent paintings inspired by our community.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Finding artistic inspiration in our community gardens' },
    image: 'https://images.unsplash.com/photo-1460661419201-fd405786f2a0?w=800&q=80',
    category: 'BLOG',
    tags: ['art', 'painting', 'gardening', 'landscape', 'inspiration'],
    authorId: 'user-fatima-hassan',
    published: true,
    featured: false,
    publishedAt: new Date('2026-04-05'),
  },
  {
    id: 'blog-fitness-routine',
    title: { en: 'My Fitness Journey in Soralia' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Moving to Soralia was the best thing for my fitness routine. The walking trails, the community park, and the amazing group of fitness enthusiasts here have kept me motivated. Here is my weekly routine and how I stay active.',
            },
          ],
        },
      ],
    },
    excerpt: { en: "Staying fit with Soralia's trails and community" },
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    category: 'BLOG',
    tags: ['fitness', 'running', 'trails', 'wellness', 'community'],
    authorId: 'user-marcus-johnson',
    published: true,
    featured: false,
    publishedAt: new Date('2026-03-18'),
  },
  {
    id: 'conservation-wetland-ecosystem',
    title: { en: 'Soralia Wetland Ecosystem' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Our Living Wetland' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The Soralia wetland is a vital part of our local ecosystem, providing habitat for diverse flora and fauna while naturally filtering stormwater runoff. Our conservation programme focuses on restoring and protecting this precious natural resource for future generations.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Current Projects' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Alien invasive plant removal — over 500 Port Jackson willows and Australian acacias removed to date',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Indigenous fynbos replanting along wetland buffers using locally sourced seed',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Water quality monitoring programme with monthly testing for nutrients, pH, and turbidity',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Bird and frog species census — 47 bird species and 8 frog species recorded',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'How You Can Help' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Join our monthly community cleanup days, participate in planting events, or simply keep the wetland areas free of litter. Every contribution makes a difference. Contact David van der Merwe to get involved.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'Protecting and restoring our local wetland ecosystem' },
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&q=80',
    category: 'CONSERVATION',
    tags: ['wetland', 'ecosystem', 'conservation', 'biodiversity'],
    authorId: 'user-david-vdm',
    published: true,
    featured: true,
    publishedAt: new Date('2026-01-15'),
  },
  {
    id: 'conservation-fynbos-guide',
    title: { en: 'Indigenous Fynbos Species of Soralia' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The Cape Floristic Region is home to over 9,000 plant species, many found nowhere else on Earth. Soralia Village sits within this unique biodiversity hotspot. Here is a guide to some of the fynbos species you can find in and around our community.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'King Protea (Protea cynaroides)' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: "South Africa's national flower, the King Protea blooms from January to April. Look for them on the southern slopes of the reserve after the first autumn rains.",
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Cape Sugarbird & Erica Species' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'The Cape Sugarbird depends entirely on protea and erica species for nectar. By protecting these plants, we protect the birds. Over 20 erica species have been recorded in our reserve.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'A guide to the unique fynbos species in our community' },
    image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&q=80',
    category: 'CONSERVATION',
    tags: ['fynbos', 'protea', 'biodiversity', 'indigenous-plants', 'cape-floral-kingdom'],
    authorId: 'user-david-vdm',
    published: true,
    featured: false,
    publishedAt: new Date('2026-02-10'),
  },
  {
    id: 'conservation-bird-count',
    title: { en: 'Annual Bird Count Results 2026' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: "This year's annual bird count recorded 47 species — up from 42 last year. Highlights include the first confirmed sighting of an African palm swift in the reserve, and a 30% increase in sunbird populations following our erica planting programme.",
            },
          ],
        },
      ],
    },
    excerpt: { en: '47 species recorded — a new high for Soralia' },
    image: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&q=80',
    category: 'CONSERVATION',
    tags: ['birds', 'bird-count', 'wildlife', 'citizen-science', 'palm-swift'],
    authorId: 'user-david-vdm',
    published: true,
    featured: false,
    publishedAt: new Date('2026-04-12'),
  },
  {
    id: 'campaign-proudly-soralia',
    title: { en: 'Proudly Soralia' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Proudly Soralia 🌿' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Proudly Soralia is our community pride campaign — a celebration of everything that makes Soralia Village special. From our stunning natural surroundings to the people who call this place home, we are building a community we can all be proud of.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'What Is Proudly Soralia?' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Inspired by the Proudly South African movement, Proudly Soralia encourages every resident to take ownership of our shared spaces, support local businesses within our community, and actively participate in making Soralia the best place to live.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Our Pillars' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: '🌱 ' },
                    {
                      type: 'text',
                      marks: [{ type: 'bold' }],
                      text: 'Environmental Stewardship',
                    },
                    {
                      type: 'text',
                      text: ' — Protect our wetlands, plant indigenous gardens, reduce waste, and conserve water',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: '🤝 ' },
                    { type: 'text', marks: [{ type: 'bold' }], text: 'Community Spirit' },
                    {
                      type: 'text',
                      text: ' — Welcome new neighbours, participate in events, and look out for one another',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: '🏡 ' },
                    { type: 'text', marks: [{ type: 'bold' }], text: 'Property Pride' },
                    {
                      type: 'text',
                      text: ' — Maintain your property to the highest standards and contribute to our streetscape beauty',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: '🎨 ' },
                    { type: 'text', marks: [{ type: 'bold' }], text: 'Local Talent' },
                    {
                      type: 'text',
                      text: ' — Showcase your skills, share your services, and support community businesses',
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: '📚 ' },
                    { type: 'text', marks: [{ type: 'bold' }], text: 'Lifelong Learning' },
                    {
                      type: 'text',
                      text: ' — Share knowledge, attend workshops, and grow together as a community',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Get Involved' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Every resident can be part of Proudly Soralia. Start by taking the pledge, joining a community event, or nominating a neighbour who embodies the spirit of Soralia. Together, we make this community extraordinary.',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Tag your Soralia moments with #ProudlySoralia on social media and share what makes our community special.',
            },
          ],
        },
      ],
    },
    excerpt: { en: 'A celebration of everything that makes Soralia Village special' },
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    category: 'CAMPAIGN',
    tags: ['proudly-soralia', 'community', 'pride', 'campaign', 'engagement'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: true,
    publishedAt: new Date('2026-04-01'),
  },
  {
    id: 'event-content-plant-swap',
    title: { en: 'Monthly Plant Swap' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Exchange plants, seeds, and cuttings with fellow gardeners. Bring at least one plant to swap. All skill levels welcome. Refreshments provided.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '📅 25 May 2026 at 10:00 AM' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '📍 Community Garden' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '👤 Organised by Sarah Mitchell' }] },
      ],
    },
    excerpt: { en: 'Share plants, seeds, and gardening tips with neighbours' },
    image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800&q=80',
    category: 'EVENT',
    tags: ['plant-swap', 'gardening', 'community', 'free'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-01'),
    expiresAt: new Date('2026-05-26'),
  },
  {
    id: 'event-content-yoga',
    title: { en: 'Morning Yoga in the Park' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Free yoga session for all levels. Bring your own mat. Suitable for beginners and experienced practitioners. Led by certified instructor Priya Naidoo.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '📅 20 May 2026 at 7:00 AM' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '📍 Community Park' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '👤 Led by Priya Naidoo' }] },
      ],
    },
    excerpt: { en: 'Free yoga for all levels in the Community Park' },
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    category: 'EVENT',
    tags: ['yoga', 'fitness', 'wellness', 'free', 'morning'],
    authorId: 'user-priya-naidoo',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-01'),
    expiresAt: new Date('2026-05-21'),
  },
  {
    id: 'event-content-book-club',
    title: { en: 'Book Club: "The Promise" by Damon Galgut' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Monthly book discussion. This month we are reading The Promise by Damon Galgut, winner of the Booker Prize. New members always welcome.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '📅 28 May 2026 at 6:30 PM' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '📍 Community Hall' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '👤 Organised by Emma Williams' }] },
      ],
    },
    excerpt: { en: 'Monthly book discussion — The Promise by Damon Galgut' },
    category: 'EVENT',
    tags: ['book-club', 'reading', 'discussion', 'community-hall'],
    authorId: 'user-emma-williams',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-01'),
    expiresAt: new Date('2026-05-29'),
  },
  {
    id: 'event-content-agm',
    title: { en: 'Annual General Meeting 2026' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Annual General Meeting of the Soralia Village Homeowners Association. Agenda includes financial report, board elections, and community updates. All owners must attend.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '📅 15 June 2026 at 7:00 PM' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '📍 Community Hall' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '👤 Board of Directors' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Welcome and apologies' }] },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Confirmation of minutes from previous AGM' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Financial report and budget approval' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Board elections' }] },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Community updates and Q&A' }],
                },
              ],
            },
          ],
        },
      ],
    },
    excerpt: { en: 'All owners must attend — financial report, board elections, and updates' },
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80',
    category: 'EVENT',
    tags: ['agm', 'meeting', 'board', 'elections', 'mandatory'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: true,
    publishedAt: new Date('2026-05-01'),
    expiresAt: new Date('2026-06-16'),
  },
  {
    id: 'event-content-aloe-workshop',
    title: { en: 'Aloe Photography Workshop' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Learn how to capture stunning photos of our iconic aloe plants. Professional photographer Michael Chen will share tips on composition, lighting, and macro photography techniques.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '📅 30 May 2026 at 8:00 AM' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '📍 Soralia Nature Reserve' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '👤 Led by Michael Chen' }] },
      ],
    },
    excerpt: { en: 'Learn macro photography techniques with our iconic aloe plants' },
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80',
    category: 'EVENT',
    tags: ['photography', 'aloe', 'workshop', 'nature', 'macro'],
    authorId: 'user-michael-chen',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-01'),
    expiresAt: new Date('2026-05-31'),
  },
  {
    id: 'event-content-braai',
    title: { en: 'Community Braai & Social' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Join your neighbours for a relaxed community braai. Bring your own meat and drinks. Sides and desserts provided by the social committee. Entertainment and activities for children.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '📅 7 June 2026 at 4:00 PM' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '📍 Community Park' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '👤 Social Committee' }] },
      ],
    },
    excerpt: { en: 'Relaxed community braai — bring your meat, sides provided' },
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    category: 'EVENT',
    tags: ['braai', 'social', 'community', 'family', 'food'],
    authorId: 'user-sarah-mitchell',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-15'),
    expiresAt: new Date('2026-06-08'),
  },
  {
    id: 'event-content-cleanup',
    title: { en: 'Community Cleanup Day' },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Help keep Soralia beautiful! Join us for a community cleanup of common areas, trails, and the wetland. Gloves and bags provided. Refreshments and thank-you braai afterwards.',
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'When & Where' }],
        },
        { type: 'paragraph', content: [{ type: 'text', text: '📅 14 June 2026 at 8:00 AM' }] },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '📍 Meeting Point: Community Hall' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '👤 Organised by David van der Merwe' }],
        },
      ],
    },
    excerpt: { en: 'Help keep Soralia beautiful — gloves and braai provided' },
    category: 'EVENT',
    tags: ['cleanup', 'volunteering', 'community', 'environment', 'wetland'],
    authorId: 'user-david-vdm',
    published: true,
    featured: false,
    publishedAt: new Date('2026-05-15'),
    expiresAt: new Date('2026-06-15'),
  },
];
