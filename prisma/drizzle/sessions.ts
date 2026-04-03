import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }).notNull(),
  token: text('token').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull(),
  activeOrganizationId: text('activeOrganizationId'),
  impersonatedBy: text('impersonatedBy'),
});
