import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const taxJurisdictions = pgTable('TaxJurisdiction', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  country: text('country').default('ZA').notNull(),
  region: text('region'),
  isDefault: boolean('isDefault').default(false).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
