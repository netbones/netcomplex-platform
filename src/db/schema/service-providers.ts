import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { providerEmploymentTypeEnum } from './provider-employment-type-enum';

export const serviceProviders = pgTable('ServiceProvider', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  companyName: text('companyName').notNull(),
  contactName: text('contactName'),
  phone: text('phone'),
  email: text('email'),
  trade: text('trade').notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  employmentType: providerEmploymentTypeEnum('employmentType').default('EXTERNAL').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
  userId: text('userId'),
  website: text('website'),
  addressId: text('addressId'),
});
