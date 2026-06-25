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
  {
    key: 'ai-provider',
    label: 'AI Provider',
    description:
      'Connect an AI provider (Anthropic or OpenAI) to enable AI-powered features across the platform',
    minTier: tierMap.STANDARD,
    defaultEnabled: false,
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
    key: 'dWallet',
    label: 'dWallet',
    minTier: tierMap.PREMIUM,
    defaultEnabled: false,
    description: 'Per-resident data rights, consent, and rewards wallet',
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
  // Seed AI pool tier quotas (SUPPLEMENTAL-2 G8: STANDARD 50k / PREMIUM 200k / ENTERPRISE 500k)
  await prisma.platformAiTierQuota.createMany({
    data: [
      { tier: 'STANDARD', monthlyTokens: 50_000, overagePolicy: 'HARD_STOP' },
      { tier: 'PREMIUM', monthlyTokens: 200_000, overagePolicy: 'THROTTLE' },
      {
        tier: 'ENTERPRISE',
        monthlyTokens: 500_000,
        overagePolicy: 'SURCHARGE',
        overageTokens: 500_000,
        overagePriceZAR: 0.0001,
      },
    ],
    skipDuplicates: true,
  });

  // Seed AI capability cost estimates
  await prisma.aiCapabilityCost.createMany({
    data: [
      { capability: 'ai.disputes.frivolityScreen', estimatedTokens: 300, maxTokens: 500 },
      { capability: 'ai.content.translation', estimatedTokens: 800, maxTokens: 2000 },
      { capability: 'ai.content.moderation', estimatedTokens: 200, maxTokens: 300 },
      { capability: 'ai.maintenance.triage', estimatedTokens: 400, maxTokens: 600 },
    ],
    skipDuplicates: true,
  });

  console.log('Seeded', modules.length, 'platform modules');
}

// Run dWallet data revenue stream seed
import './dwallet-streams';

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
