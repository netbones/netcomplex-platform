import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const organizations = pgTable('Organization', { id: text('id').primaryKey(), tenantId: text('tenantId').notNull(), name: text('name').notNull(), slug: text('slug').notNull(), logo: text('logo'), createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).notNull(), metadata: text('metadata') });