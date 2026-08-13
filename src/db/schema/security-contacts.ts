import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { securityContactTypeEnum } from './security-contact-type-enum';

export const securityContacts = pgTable('SecurityContact', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  label: text('label').notNull(),
  phone: text('phone').notNull(),
  contactType: securityContactTypeEnum('contactType').notNull(),
  isDefaultCallTarget: boolean('isDefaultCallTarget').default(false).notNull(),
  createdByUserId: text('createdByUserId').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
