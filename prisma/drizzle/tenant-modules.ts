import { pgTable, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const tenantModules = pgTable('TenantModule', { id: text('id').primaryKey(), tenantId: text('tenantId').notNull(), moduleKey: text('moduleKey').notNull(), enabled: boolean('enabled').default(false).notNull(), config: jsonb('config'), enabledAt: timestamp('enabledAt', { mode: 'date', precision: 3 }) });