import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TODO: Make tenant-aware — currently hardcoded to Soralia Village.
// When multi-tenant seeding is implemented, read tenantId from env/config.
const SORALIA_TENANT_ID = 'soralia';

const streams = [
  {
    key: 'survey_participation',
    label: 'Survey Participation',
    description: 'Controls data usage for third-party surveys',
    residentSharePct: 20,
    isActive: true,
  },
  {
    key: 'marketplace_activity',
    label: 'Marketplace Activity',
    description: 'Controls data usage for marketplace analytics',
    residentSharePct: 20,
    isActive: true,
  },
  {
    key: 'agent_transactions',
    label: 'Agent Transactions',
    description: 'Controls data usage for agent marketplace',
    residentSharePct: 20,
    isActive: true,
  },
  {
    key: 'value_added_services',
    label: 'Value-Added Services',
    description: 'Controls data usage for VAS improvement',
    residentSharePct: 20,
    isActive: true,
  },
  {
    key: 'service_provider_listings',
    label: 'Service Provider Listings',
    description: 'Controls data usage for provider analytics',
    residentSharePct: 10,
    isActive: true,
  },
  {
    key: 'premium_placements',
    label: 'Premium Placements',
    description: 'Controls data usage for listing analytics',
    residentSharePct: 10,
    isActive: true,
  },
  {
    key: 'agent_registrations',
    label: 'Agent Registrations',
    description: 'Controls data usage for agent registration data',
    residentSharePct: 10,
    isActive: true,
  },
  {
    key: 'agent_premium_listings',
    label: 'Agent Premium Listings',
    description: 'Controls data usage for premium listing data',
    residentSharePct: 10,
    isActive: true,
  },
];

async function main() {
  for (const s of streams) {
    await prisma.dataRevenueStream.upsert({
      where: {
        tenantId_key: {
          tenantId: SORALIA_TENANT_ID,
          key: s.key,
        },
      },
      update: s,
      create: {
        ...s,
        tenantId: SORALIA_TENANT_ID,
      },
    });
  }

  console.log(`Seeded ${streams.length} data revenue streams for tenant ${SORALIA_TENANT_ID}`);
  // TODO: confirm against Schedule F Table 2 — placeholder percentages used until prod confirmation
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
