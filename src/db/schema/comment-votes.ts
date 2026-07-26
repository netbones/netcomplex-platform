import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { commentVoteTypeEnum } from './comment-vote-type-enum';

export const commentVotes = pgTable('CommentVote', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  commentId: text('commentId').notNull(),
  userId: text('userId').notNull(),
  type: commentVoteTypeEnum('type').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
});
