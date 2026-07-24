import { relations } from 'drizzle-orm';
import { aiUsageEvents } from './ai-usage-events';
import { tenants } from './tenants';
import { tenantAiUsages } from './tenant-ai-usages';

export const aiUsageEventsRelations = relations(aiUsageEvents, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'AiUsageEventToTenant', fields: [ aiUsageEvents.tenantId ], references: [ tenants.id ] }), usage: helpers.one(tenantAiUsages, { relationName: 'AiUsageEventToTenantAiUsage', fields: [ aiUsageEvents.usageId ], references: [ tenantAiUsages.id ] }) }));