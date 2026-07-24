import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { contentAuditActionEnum } from './content-audit-action-enum';

export const contentAuditLogs = pgTable('ContentAuditLog', { id: text('id').primaryKey(), contentId: text('contentId').notNull(), userId: text('userId'), action: contentAuditActionEnum('action').notNull(), metadata: jsonb('metadata'), createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).defaultNow().notNull() });