import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const standardSeats = pgTable('standardSeat', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  propertyId: text('propertyId').notNull(),
  isPrimaryOwner: boolean('isPrimaryOwner').default(true).notNull(),
  platformAddress: text('platformAddress').notNull(),
  organizationId: text('organizationId'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
