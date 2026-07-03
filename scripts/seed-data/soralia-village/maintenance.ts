import type {
  MaintenanceCategoryInput,
  BursaryFieldInput,
  EducationBursaryInput,
  EducationResourceInput,
  MaintenanceTeamInput,
  ServiceProviderInput,
  MaintenanceRequestInput,
} from '../types';

export const maintenanceCategories: MaintenanceCategoryInput[] = [
  {
    id: 'cat-plumbing',
    value: 'PLUMBING',
    label: 'Plumbing',
    description: 'Water supply, drainage, and pipe systems',
    isActive: true,
  },
  {
    id: 'cat-electrical',
    value: 'ELECTRICAL',
    label: 'Electrical',
    description: 'Power supply, wiring, and electrical fixtures',
    isActive: true,
  },
  {
    id: 'cat-hvac',
    value: 'HVAC',
    label: 'HVAC',
    description: 'Heating, ventilation, and air conditioning',
    isActive: true,
  },
  {
    id: 'cat-landscaping',
    value: 'LANDSCAPING',
    label: 'Landscaping',
    description: 'Gardens, irrigation, trees, and outdoor areas',
    isActive: true,
  },
  {
    id: 'cat-structural',
    value: 'STRUCTURAL',
    label: 'Structural',
    description: 'Building structure, walls, doors, windows',
    isActive: true,
  },
  {
    id: 'cat-network',
    value: 'NETWORK',
    label: 'Network',
    description: 'Internet, fibre, and network infrastructure',
    isActive: true,
  },
  {
    id: 'cat-waste',
    value: 'WASTE',
    label: 'Waste Management',
    description: 'Rubbish removal, recycling, and bulk waste',
    isActive: true,
  },
  {
    id: 'cat-security',
    value: 'SECURITY',
    label: 'Security',
    description: 'Alarm systems, CCTV, and access control',
    isActive: true,
  },
  {
    id: 'cat-other',
    value: 'OTHER',
    label: 'Other',
    description: "Requests that don't fit other categories",
    isActive: true,
  },
];

export const bursaryFields: BursaryFieldInput[] = [
  {
    id: 'bf-stem',
    value: 'STEM',
    label: 'STEM',
    description: 'Science, Technology, Engineering, Mathematics',
    isActive: true,
  },
  {
    id: 'bf-commerce',
    value: 'Commerce',
    label: 'Commerce',
    description: 'Business, Finance, Accounting, Economics',
    isActive: true,
  },
  {
    id: 'bf-arts',
    value: 'Arts',
    label: 'Arts',
    description: 'Visual Arts, Performing Arts, Design, Music',
    isActive: true,
  },
  {
    id: 'bf-health',
    value: 'Health',
    label: 'Health',
    description: 'Medicine, Nursing, Pharmacy, Public Health',
    isActive: true,
  },
  {
    id: 'bf-law',
    value: 'Law',
    label: 'Law',
    description: 'Legal studies, Human Rights, Criminology',
    isActive: true,
  },
  {
    id: 'bf-education',
    value: 'Education',
    label: 'Education',
    description: 'Teaching, Curriculum Development, Educational Psychology',
    isActive: true,
  },
  {
    id: 'bf-general',
    value: 'General',
    label: 'General',
    description: 'Any field of study',
    isActive: true,
  },
];

export const educationBursaries: EducationBursaryInput[] = [
  {
    id: 'eb-sasol',
    title: 'Sasol Bursary Programme',
    funder: 'Sasol Ltd',
    fieldId: 'bf-stem',
    amount: 'R90 000/yr',
    description:
      'Full-cost bursaries for STEM students at South African universities. Covers tuition, accommodation, meals, and a book allowance.',
    applyUrl: 'https://www.sasolbursaries.com',
    deadline: new Date('2026-03-31'),
    status: 'PUBLISHED',
  },
  {
    id: 'eb-oldmutual',
    title: 'Old Mutual Education Trust',
    funder: 'Old Mutual',
    fieldId: 'bf-commerce',
    amount: 'R60 000/yr',
    description:
      'Funding for commerce and business students. Preference given to dependents of Old Mutual members and staff.',
    applyUrl: 'https://www.oldmutual.co.za',
    deadline: new Date('2026-04-15'),
    status: 'PUBLISHED',
  },
  {
    id: 'eb-doh',
    title: 'Department of Health Bursary',
    funder: 'Western Cape DoH',
    fieldId: 'bf-health',
    amount: 'R120 000/yr',
    description:
      'Provincial health bursary for medical, nursing, and allied health students. Includes a service obligation upon graduation.',
    deadline: new Date('2026-07-31'),
    status: 'PUBLISHED',
  },
  {
    id: 'eb-fulbright',
    title: 'Fulbright Foreign Student Program',
    funder: 'US Embassy',
    fieldId: 'bf-arts',
    amount: 'Full tuition',
    description:
      'Prestigious international scholarship for South African graduates to study in the United States. Covers full tuition, travel, and living stipend.',
    applyUrl: 'https://za.usembassy.gov',
    deadline: new Date('2026-05-31'),
    status: 'PUBLISHED',
  },
  {
    id: 'eb-funza',
    title: 'Funza Lushaka Teaching Bursary',
    funder: 'Department of Basic Education',
    fieldId: 'bf-education',
    amount: 'R100 000/yr',
    description:
      'National bursary for students pursuing teaching qualifications. Includes a service obligation in public schools.',
    applyUrl: 'https://www.funzalushaka.doe.gov.za',
    deadline: new Date('2026-04-30'),
    status: 'PUBLISHED',
  },
];

export const educationResources: EducationResourceInput[] = [
  {
    id: 'er-khan',
    title: 'Khan Academy',
    description:
      'Free world-class education covering maths, science, computing, and more. Interactive exercises and instructional videos.',
    provider: 'Khan Academy',
    externalUrl: 'https://www.khanacademy.org',
    mediaType: 'COURSE',
    tags: ['maths', 'science', 'computing'],
    featured: false,
  },
  {
    id: 'er-mit',
    title: 'MIT OpenCourseWare',
    description:
      'Nearly all MIT undergraduate and graduate course materials — free, open, and available to everyone.',
    provider: 'MIT',
    externalUrl: 'https://ocw.mit.edu',
    mediaType: 'COURSE',
    tags: ['university', 'engineering', 'science'],
    featured: false,
  },
  {
    id: 'er-siyavula',
    title: 'Siyavula Open Textbooks',
    description:
      'Free, CAPS-aligned maths and science textbooks for Grades 4–12, available in English and Afrikaans.',
    provider: 'Siyavula Education',
    externalUrl: 'https://www.siyavula.com',
    mediaType: 'BOOK',
    tags: ['textbook', 'maths', 'science', 'caps'],
    featured: false,
  },
  {
    id: 'er-coursera',
    title: 'Coursera',
    description:
      'Access free courses from top universities and companies worldwide. Earn certificates and build career skills.',
    provider: 'Coursera',
    externalUrl: 'https://www.coursera.org',
    mediaType: 'COURSE',
    tags: ['university', 'career', 'certificates'],
    featured: false,
  },
  {
    id: 'er-teded',
    title: 'TED-Ed',
    description:
      'Short, award-winning animated videos about ideas that spark curiosity. Lessons worth sharing for learners of all ages.',
    provider: 'TED',
    externalUrl: 'https://ed.ted.com',
    mediaType: 'VIDEO',
    tags: ['curiosity', 'animation', 'lessons'],
    featured: false,
  },
];

export const maintenanceTeams: MaintenanceTeamInput[] = [
  {
    id: 'team-plumbing',
    name: 'Plumbing Team',
    trade: 'PLUMBING',
    contactName: 'Thabo Mokoena',
    isActive: true,
  },
  {
    id: 'team-electrical',
    name: 'Electrical Team',
    trade: 'ELECTRICAL',
    contactName: 'Sarah van der Merwe',
    isActive: true,
  },
  {
    id: 'team-landscaping',
    name: 'Landscaping Team',
    trade: 'LANDSCAPING',
    contactName: 'David Nkosi',
    isActive: true,
  },
];

export const serviceProviders: ServiceProviderInput[] = [
  {
    id: 'prov-pipe-burst',
    companyName: 'PipeBurst Solutions Inc.',
    trade: 'PLUMBING',
    phone: '+27 82 555 0101',
    isActive: true,
  },
  {
    id: 'prov-tree-felling',
    companyName: 'TreeCare Pros',
    trade: 'LANDSCAPING',
    phone: '+27 82 555 0102',
    isActive: true,
  },
  {
    id: 'prov-electrical',
    companyName: 'VoltSafe Electrical',
    trade: 'ELECTRICAL',
    phone: '+27 82 555 0103',
    isActive: true,
  },
  {
    id: 'prov-network',
    companyName: 'FibreConnect ISP',
    trade: 'NETWORK',
    phone: '+27 82 555 0104',
    isActive: true,
  },
  {
    id: 'prov-waste',
    companyName: 'WasteWise Collectors',
    trade: 'WASTE',
    phone: '+27 82 555 0105',
    isActive: true,
  },
];

export const maintenanceRequests: MaintenanceRequestInput[] = [
  {
    id: 'mr-irrigation-01',
    userId: 'user-john-smith',
    category: 'LANDSCAPING',
    priority: 'MEDIUM',
    status: 'SUBMITTED',
    ticketNumber: 'SRV-2026-0001',
    description:
      "The automated sprinkler system in the common garden area has been malfunctioning for the past week. Zones 3 and 4 aren't turning on, and zone 2 runs continuously.",
    images: [],
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
  },
  {
    id: 'mr-burst-pipe',
    userId: 'user-sarah-mitchell',
    category: 'PLUMBING',
    priority: 'EMERGENCY',
    status: 'IN_PROGRESS',
    ticketNumber: 'SRV-2026-0002',
    assignedTeamId: 'team-plumbing',
    description:
      'Water pipe burst in the kitchen wall. Water damage spreading to ground floor. Need immediate shutdown of water supply to building B.',
    images: [],
    createdAt: new Date('2026-06-03T12:00:00Z'),
    updatedAt: new Date('2026-06-03T22:00:00Z'),
  },
  {
    id: 'mr-tree-felling',
    userId: 'user-michael-chen',
    category: 'LANDSCAPING',
    priority: 'HIGH',
    status: 'SUBMITTED',
    ticketNumber: 'SRV-2026-0003',
    description:
      "The old oak tree near the children's playground has a large dead branch hanging over the play area. Risk of it falling during the next storm.",
    images: [],
    createdAt: new Date('2026-06-03T00:00:00Z'),
    updatedAt: new Date('2026-06-03T00:00:00Z'),
  },
  {
    id: 'mr-network-outage',
    userId: 'user-john-smith',
    category: 'NETWORK',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    ticketNumber: 'SRV-2026-0004',
    assignedProviderId: 'prov-network',
    description:
      'Fiber optic cable cut by contractors during roadworks on the main access road. All units in Blocks A and B have no internet connectivity since yesterday. FibreConnect has been notified.',
    images: [],
    createdAt: new Date('2026-06-02T00:00:00Z'),
    updatedAt: new Date('2026-06-03T18:00:00Z'),
  },
  {
    id: 'mr-electrical-mains',
    userId: 'user-anna-patel',
    category: 'ELECTRICAL',
    priority: 'HIGH',
    status: 'ASSIGNED',
    ticketNumber: 'SRV-2026-0005',
    assignedTeamId: 'team-electrical',
    description:
      'Flickering lights and intermittent power surges in Block C units 20-30. Affects all rooms. Neighbors in adjacent units report similar issues. Seems to be related to the main supply line.',
    images: [],
    createdAt: new Date('2026-05-31T00:00:00Z'),
    updatedAt: new Date('2026-06-03T00:00:00Z'),
  },
  {
    id: 'mr-bin-removal',
    userId: 'user-sarah-mitchell',
    category: 'WASTE',
    priority: 'LOW',
    status: 'CANCELLED',
    ticketNumber: 'SRV-2026-0006',
    description:
      "Requesting removal of bulky waste (old furniture, mattresses) from unit 8. Normal bin collection can't handle these items.",
    images: [],
    createdAt: new Date('2026-05-21T00:00:00Z'),
    updatedAt: new Date('2026-05-23T00:00:00Z'),
  },
  {
    id: 'mr-garage-door',
    userId: 'user-michael-chen',
    category: 'STRUCTURAL',
    priority: 'LOW',
    status: 'SUBMITTED',
    ticketNumber: 'SRV-2026-0007',
    description:
      'The garage door at unit 17B has been sticking intermittently for the past 3 months. It makes a loud grinding noise when opening and sometimes gets stuck halfway. Have reported twice before but issue persists.',
    images: [],
    createdAt: new Date('2026-03-06T00:00:00Z'),
    updatedAt: new Date('2026-05-30T00:00:00Z'),
  },
];
