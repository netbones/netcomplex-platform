import { relations } from 'drizzle-orm';
import { aiUsageEvents } from './ai-usage-events';
import { tenantAiUsages } from './tenant-ai-usages';

export const aiUsageEventsRelations = relations(aiUsageEvents, (helpers) => ({ usage: helpers.one(tenantAiUsages, { relationName: 'AiUsageEventToTenantAiUsage', fields: [ aiUsageEvents.usageId ], references: [ tenantAiUsages.id ] }) }));