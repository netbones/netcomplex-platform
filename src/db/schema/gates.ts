import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { gateIntegrationTypeEnum } from './gate-integration-type-enum';

export const gates = pgTable('Gate', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  name: text('name').notNull(),
  integrationType: gateIntegrationTypeEnum('integrationType').default('MANUAL').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
