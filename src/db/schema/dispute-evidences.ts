import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const disputeEvidences = pgTable('DisputeEvidence', {
  id: text('id').primaryKey(),
  tenantId: text('tenantId').notNull(),
  disputeId: text('disputeId').notNull(),
  uploadedBy: text('uploadedBy').notNull(),
  fileUrl: text('fileUrl').notNull(),
  fileType: text('fileType').notNull(),
  fileName: text('fileName').notNull(),
  description: text('description'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { mode: 'date', precision: 3 }),
});
