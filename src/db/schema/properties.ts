import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const properties = pgTable('Property', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  platformAddress: text('platformAddress').notNull(),
  street: text('street').notNull(),
  unit: text('unit').notNull(),
  ownerId: text('ownerId'),
  homeImage: text('homeImage'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
