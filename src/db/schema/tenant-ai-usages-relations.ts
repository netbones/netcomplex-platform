import { relations } from 'drizzle-orm';
import { tenantAiUsages } from './tenant-ai-usages';
import { tenants } from './tenants';
import { aiUsageEvents } from './ai-usage-events';

export const tenantAiUsagesRelations = relations(tenantAiUsages, (helpers) => ({ Tenant: helpers.one(tenants, { relationName: 'TenantToTenantAiUsage', fields: [ tenantAiUsages.tenantId ], references: [ tenants.id ] }), events: helpers.many(aiUsageEvents, { relationName: 'AiUsageEventToTenantAiUsage' }) }));