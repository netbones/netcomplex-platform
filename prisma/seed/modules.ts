import { PrismaClient, type Tier } from '@prisma/client';

const prisma = new PrismaClient();

const tierMap: Record<string, Tier> = {
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM',
  ENTERPRISE: 'ENTERPRISE',
} as const;

const modules = [
  // Core - always available
  {
    key: 'dashboard',
    label: 'Dashboard',
    minTier: tierMap.STANDARD,
    defaultEnabled: true,
    description: 'User dashboard with widgets',
  },
  {
    key: 'auth',
    label: 'Authentication',
    minTier: tierMap.STANDARD,
    defaultEnabled: true,
    description: 'User authentication and sessions',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    minTier: tierMap.STANDARD,
    defaultEnabled: true,
    description: 'In-app notifications',
  },
  {
    key: 'settings',
    label: 'Settings',
    minTier: tierMap.STANDARD,
    defaultEnabled: true,
    description: 'User and tenant settings',
  },

  // Standard
  {
    key: 'directory',
    label: 'Directory',
    minTier: tierMap.STANDARD,
    defaultEnabled: true,
    description: 'Community member directory',
  },
  {
    key: 'groups',
    label: 'Groups',
    minTier: tierMap.STANDARD,
    defaultEnabled: true,
    description: 'Interest groups and memberships',
  },
  {
    key: 'maintenance',
    label: 'Maintenance Requests',
    minTier: tierMap.STANDARD,
    defaultEnabled: true,
    description: 'Submit and track maintenance requests',
  },
  {
    key: 'community-services',
    label: 'Community Services',
    minTier: tierMap.STANDARD,
    defaultEnabled: true,
    description: 'Local service marketplace',
  },
  {
    key: 'content',
    label: 'Content Management',
    minTier: tierMap.STANDARD,
    defaultEnabled: true,
    description: 'CMS for news, events, blogs',
  },

  // Premium
  {
    key: 'bookings',
    label: 'Facility Booking',
    minTier: tierMap.PREMIUM,
    defaultEnabled: true,
    description: 'Book community facilities',
  },
  {
    key: 'premium-seats',
    label: 'Premium Seats',
    minTier: tierMap.PREMIUM,
    defaultEnabled: true,
    description: 'Multi-property portfolio management',
  },
  {
    key: 'property-listings',
    label: 'Property Listings',
    minTier: tierMap.PREMIUM,
    defaultEnabled: true,
    description: 'Real estate marketplace',
  },
  {
    key: 'competitions',
    label: 'Competitions',
    minTier: tierMap.PREMIUM,
    defaultEnabled: true,
    description: 'Community competitions and contests',
  },
  {
    key: 'providers',
    label: 'Service Providers',
    minTier: tierMap.PREMIUM,
    defaultEnabled: true,
    description: 'Provider directory, verification, and billing',
  },
  {
    key: 'conservation',
    label: 'Conservation',
    minTier: tierMap.PREMIUM,
    defaultEnabled: true,
    description: 'Conservation area features and management',
  },

  // Enterprise
  {
    key: 'agent-marketplace',
    label: 'Agent Marketplace',
    minTier: tierMap.ENTERPRISE,
    defaultEnabled: false,
    description: 'Agent directory and lead management',
  },
  {
    key: 'white-label',
    label: 'White Label',
    minTier: tierMap.ENTERPRISE,
    defaultEnabled: false,
    description: 'Custom domain and branding',
  },
];

async function main() {
  for (const m of modules) {
    await prisma.platformModule.upsert({
      where: { key: m.key },
      update: m,
      create: m,
    });
  }
  console.log('Seeded', modules.length, 'platform modules');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
