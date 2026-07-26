import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { commentStatusEnum } from './comment-status-enum';

export const comments = pgTable('Comment', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  contentId: text('contentId').notNull(),
  authorId: text('authorId').notNull(),
  parentId: text('parentId'),
  rootId: text('rootId'),
  body: text('body').notNull(),
  status: commentStatusEnum('status').default('PUBLISHED').notNull(),
  score: integer('score').default(0).notNull(),
  upvotes: integer('upvotes').default(0).notNull(),
  downvotes: integer('downvotes').default(0).notNull(),
  moderatedBy: text('moderatedBy'),
  moderatedAt: timestamp('moderatedAt', { mode: 'date', precision: 3 }),
  moderationNotes: text('moderationNotes'),
  editedAt: timestamp('editedAt', { mode: 'date', precision: 3 }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
