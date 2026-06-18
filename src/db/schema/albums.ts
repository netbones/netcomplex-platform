import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const albums = pgTable('Album', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  userId: text('userId').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  isPublic: boolean('isPublic').default(false).notNull(),
  mediaIds: text('mediaIds').array().notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
