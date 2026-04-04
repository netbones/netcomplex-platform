import { pgTable, text } from 'drizzle-orm/pg-core';

export const settings = pgTable('Setting', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
});
