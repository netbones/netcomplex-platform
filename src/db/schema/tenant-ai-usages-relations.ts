import { relations } from 'drizzle-orm';
import { tenantAiUsages } from './tenant-ai-usages';
import { aiUsageEvents } from './ai-usage-events';

export const tenantAiUsagesRelations = relations(tenantAiUsages, (helpers) => ({ events: helpers.many(aiUsageEvents, { relationName: 'AiUsageEventToTenantAiUsage' }) }));