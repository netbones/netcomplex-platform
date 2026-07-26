import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { reportReasonEnum } from './report-reason-enum';
import { reportResolutionEnum } from './report-resolution-enum';

export const commentReports = pgTable('CommentReport', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  commentId: text('commentId').notNull(),
  reporterId: text('reporterId').notNull(),
  reason: reportReasonEnum('reason').notNull(),
  note: text('note'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  resolvedAt: timestamp('resolvedAt', { mode: 'date', precision: 3 }),
  resolvedBy: text('resolvedBy'),
  resolution: reportResolutionEnum('resolution'),
});
