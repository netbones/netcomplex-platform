import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const modules = [
  // Core - always available
  {
    key: 'dashboard',
    label: 'Dashboard',
    minTier: 'STANDARD',
    defaultEnabled: true,
    description: 'User dashboard with widgets',
  },
  {
    key: 'auth',
    label: 'Authentication',
    minTier: 'STANDARD',
    defaultEnabled: true,
    description: 'User authentication and sessions',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    minTier: 'STANDARD',
    defaultEnabled: true,
    description: 'In-app notifications',
  },
  {
    key: 'settings',
    label: 'Settings',
    minTier: 'STANDARD',
    defaultEnabled: true,
    description: 'User and tenant settings',
  },

  // Standard
  {
    key: 'directory',
    label: 'Directory',
    minTier: 'STANDARD',
    defaultEnabled: true,
    description: 'Community member directory',
  },
  {
    key: 'groups',
    label: 'Groups',
    minTier: 'STANDARD',
    defaultEnabled: true,
    description: 'Interest groups and memberships',
  },
  {
    key: 'maintenance',
    label: 'Maintenance Requests',
    minTier: 'STANDARD',
    defaultEnabled: true,
    description: 'Submit and track maintenance requests',
  },
  {
    key: 'community-services',
    label: 'Community Services',
    minTier: 'STANDARD',
    defaultEnabled: true,
    description: 'Local service marketplace',
  },
  {
    key: 'content',
    label: 'Content Management',
    minTier: 'STANDARD',
    defaultEnabled: true,
    description: 'CMS for news, events, blogs',
  },

  // Premium
  {
    key: 'bookings',
    label: 'Facility Booking',
    minTier: 'PREMIUM',
    defaultEnabled: false,
    description: 'Book community facilities',
  },
  {
    key: 'premium-seats',
    label: 'Premium Seats',
    minTier: 'PREMIUM',
    defaultEnabled: false,
    description: 'Multi-property portfolio management',
  },
  {
    key: 'property-listings',
    label: 'Property Listings',
    minTier: 'PREMIUM',
    defaultEnabled: false,
    description: 'Real estate marketplace',
  },

  // Enterprise
  {
    key: 'agent-marketplace',
    label: 'Agent Marketplace',
    minTier: 'ENTERPRISE',
    defaultEnabled: false,
    description: 'Agent directory and lead management',
  },
  {
    key: 'white-label',
    label: 'White Label',
    minTier: 'ENTERPRISE',
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
