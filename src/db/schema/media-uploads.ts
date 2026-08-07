import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const mediaUploads = pgTable('MediaUpload', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  tenantId: text('tenantId').notNull(),
  key: text('key').notNull(),
  url: text('url').notNull(),
  fileName: text('fileName').notNull(),
  fileSize: integer('fileSize').notNull(),
  mimeType: text('mimeType').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
