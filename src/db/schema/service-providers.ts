import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const serviceProviders = pgTable('ServiceProvider', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId'),
  companyName: text('companyName').notNull(),
  contactName: text('contactName'),
  phone: text('phone'),
  email: text('email'),
  trade: text('trade').notNull(),
  website: text('website'),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
  addressId: text('addressId'),
});
